# backend/app.py
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Flask App
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True) # Allows your React frontend to talk to this backend

# Configure Database (SQLite is built into Python, no extra setup needed!)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hireprep.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

# Initialize Extensions
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ==========================================
# 1. DATABASE MODELS (How data is saved)
# ==========================================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

class InterviewSession(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    job_title = db.Column(db.String(100))
    data = db.Column(db.Text) # We'll store the whole session object as a JSON string
    date = db.Column(db.String(50))

# Create the database tables
with app.app_context():
    db.create_all()

# ==========================================
# 2. AUTHENTICATION ROUTES
# ==========================================
@app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"message": "Email already registered"}), 400
        
    # Hash the password for security
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    
    new_user = User(name=data['name'], email=data['email'], password=hashed_password)
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"message": "User created successfully"}), 201

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    # Check if user exists and password is correct
    if user and bcrypt.check_password_hash(user.password, data['password']):
        # Create a token that the frontend can use to prove who they are
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "token": access_token, 
            "user": {"name": user.name, "email": user.email}
        }), 200
        
    return jsonify({"message": "Invalid credentials"}), 401

# ==========================================
# 3. GEMINI AI ROUTES
# ==========================================
@app.route('/api/generate-questions', methods=['POST'])
@jwt_required() # This requires the user to be logged in to use this!
def generate_questions():
    setup = request.get_json()
    print(setup)
    print("JWT Authentication successful", flush=True)
    
    prompt = f"""
      Generate {setup.get('questionCount')} high-quality interview questions for a candidate with the following profile:
      Job Title: {setup.get('jobTitle')}
      Experience: {setup.get('yearsOfExperience')} years
      Tech Stack: {setup.get('techStack')}
      Target Level: {setup.get('difficulty')}
      Job Description: {setup.get('jobDescription')}
      
      CRITICAL INSTRUCTIONS:
      - Return EXACTLY {setup.get('questionCount')} questions.
      - Mix technical questions specific to the tech stack and behavioral questions.
      - Format as a valid JSON array of objects with "id" and "text" fields.
      - DO NOT include any markdown formatting like ```json. Return only raw JSON.
    """
    
    try:
        print("Received setup object:", setup, flush=True)
        print("Generated AI Prompt:\n", prompt)
        model = genai.GenerativeModel('gemini-2.5-pro')
        response = model.generate_content(prompt)
        # Parse the text string into actual JSON before sending it to frontend
        cleaned_text = response.text.replace('```json', '').replace('```', '').strip()
        questions_data = json.loads(cleaned_text)
        
        
        return jsonify(questions_data), 200
    except Exception as e:
        print("Error:", e)
        return jsonify({"message": "Failed to generate questions"}), 500

# backend/app.py

@app.route('/api/analyze-session', methods=['POST'])
@jwt_required()
def analyze_session():
    session_data = request.get_json()
    
    # Extract the data sent from React
    transcript = session_data.get('transcript', [])
    transcript_text = "\n".join(transcript)
    job_title = session_data.get('setup', {}).get('jobTitle', 'N/A')
    difficulty = session_data.get('setup', {}).get('difficulty', 'N/A')

    # The prompt tells Gemini exactly how to "score" the user
    prompt = f"""
      Analyze this interview transcript for a {job_title} role (Target Level: {difficulty}):
      
      TRANSCRIPT:
      {transcript_text}
      
      CRITICAL INSTRUCTIONS:
      Evaluate the candidate on Content, Communication, and Confidence. 
      Identify filler words (like "um", "uh", "like") to provide metrics.
      
      Return ONLY a raw JSON object with this EXACT structure:
      {{
        "overallScore": number (0-100),
        "strengths": [string],
        "weaknesses": [string],
        "contentFeedback": string,
        "speechFeedback": string,
        "improvementTips": [string],
        "speechMetrics": {{
          "fillerWordCount": number,
          "paceDescription": string,
          "clarityScore": number (0-100)
        }}
      }}
    """

    try:
        # We use gemini-1.5-flash here because it's fast and great for analysis
        model = genai.GenerativeModel('gemini-2.5-pro')
        response = model.generate_content(prompt)
        
        # Clean the response text (sometimes AI adds ```json ... ``` blocks)
        cleaned_text = response.text.strip().replace('```json', '').replace('```', '')
        analysis_json = json.loads(cleaned_text)
        
        return jsonify(analysis_json), 200
    except Exception as e:
        print("Analysis Error:", e)
        return jsonify({"message": "Failed to analyze interview"}), 500
    
@app.route('/api/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    user_id = get_jwt_identity()
    sessions = InterviewSession.query.filter_by(user_id=int(user_id)).all()
    # Convert string back to JSON objects for React
    return jsonify([json.loads(s.data) for s in sessions]), 200


@app.route('/api/sessions', methods=['POST'])
@jwt_required()
def save_session():
    user_id = get_jwt_identity()
    session_data = request.get_json()
    
    # Check if session exists (to update) or create new
    existing = InterviewSession.query.filter_by(id=session_data['id']).first()
    if existing:
        existing.data = json.dumps(session_data)
    else:
        new_session = InterviewSession(
            id=session_data['id'],
            user_id=user_id,
            job_title=session_data['setup']['jobTitle'],
            data=json.dumps(session_data),
            date=session_data['date']
        )
        db.session.add(new_session)
    
    db.session.commit()
    return jsonify({"message": "Saved"}), 200

@app.route('/api/chat', methods=['POST'])
@jwt_required()
def chat():
    try:
        data = request.get_json()
        # Expecting the full conversation history and the interview setup
        history = data.get('history', [])
        setup = data.get('setup', {})
        
        # Initialize the model (using the stable 2026 name)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Build a system instruction to keep the AI in character
        persona = setup.get('persona', 'Professional')
        job = setup.get('jobTitle', 'Candidate')
        
        chat_session = model.start_chat(history=history[:-1]) # History without the latest message
        response = chat_session.send_message(history[-1]['parts'][0]['text'])
        
        return jsonify({"text": response.text}), 200
    except Exception as e:
        print(f"Chat Error: {e}")
        return jsonify({"message": "Interviewer is speechless", "error": str(e)}), 500

# Run the server
if __name__ == '__main__':
    app.run(debug=True, port=5000)