from flask import Flask, render_template, jsonify
import os
import json
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__, static_folder="static", template_folder="templates")

@app.route("/")
def index():
    
    return render_template("index.html", tmdb_api_key=os.getenv("TMDB_API_KEY"))

@app.route("/movie")
def movie():
   
    return render_template("movie.html", tmdb_api_key=os.getenv("TMDB_API_KEY"))

@app.route("/wishlist")
def wishlist():
    return render_template("wishlist.html")

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/signup")
def signup():
    return render_template("signup.html")

@app.route("/data/movies_full.json")
def get_movies():
    json_path = os.path.join("data", "movies_full.json")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True)
