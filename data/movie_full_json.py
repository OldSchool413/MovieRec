import pandas as pd
import requests
import time
import json
import re
import os

API_KEY = "82949e8e5f0fdee432a981cfb0d77abe"
MOVIE_LENS_PATH = "ml-32m/movies.csv"
LINKS_PATH = "ml-32m/links.csv"
OUTPUT_FILE = "movies_full.json"
MAX_MOVIES = 25000

# ✅ Safe resume if file exists and is valid
if os.path.exists(OUTPUT_FILE) and os.path.getsize(OUTPUT_FILE) > 0:
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            movies = json.load(f)
        existing_ids = set(m["movieId"] for m in movies)
        print(f"🔁 Resuming from {len(movies)} movies...")
    except json.JSONDecodeError:
        print("⚠️ movies_full.json is corrupted. Starting fresh...")
        movies = []
        existing_ids = set()
else:
    movies = []
    existing_ids = set()

# 🔗 Merge MovieLens with TMDb IDs
movies_df = pd.read_csv(MOVIE_LENS_PATH)
links_df = pd.read_csv(LINKS_PATH)
merged = pd.merge(movies_df, links_df, on="movieId")
merged = merged.dropna(subset=["tmdbId"]).copy()
merged["tmdbId"] = merged["tmdbId"].astype(int)

# 📡 Fetch TMDb details + credits
def get_tmdb_info(tmdb_id):
    url_info = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={API_KEY}"
    url_credits = f"https://api.themoviedb.org/3/movie/{tmdb_id}/credits?api_key={API_KEY}"
    info, credits = {}, {}
    try:
        info = requests.get(url_info).json()
        credits = requests.get(url_credits).json()
    except Exception as e:
        print(f"⚠️ TMDb error for ID {tmdb_id}: {e}")
    return info, credits

# 🚀 Main loop
for _, row in merged.iterrows():
    if len(movies) >= MAX_MOVIES:
        break
    movie_id = int(row["movieId"])
    if movie_id in existing_ids:
        continue

    tmdb_id = int(row["tmdbId"])
    title = row["title"]
    genres = row["genres"]

    info, credits = get_tmdb_info(tmdb_id)
    poster_path = info.get("poster_path", "")
    overview = info.get("overview", "")
    vote_avg = info.get("vote_average", 0)
    rating_note = f"IMDb rating: {vote_avg}/10" if vote_avg else "No rating available"

    # 🎭 Extract cast names
    full_cast = [cast["name"] for cast in credits.get("cast", [])]

    # 📅 Year extraction from title
    match = re.search(r"\((\d{4})\)", title)
    year = int(match.group(1)) if match else None

    if not poster_path:
        print(f"⚠️ No poster for '{title}', continuing...")

    movie_data = {
        "movieId": movie_id,
        "title": title,
        "genres": genres,
        "poster_path": poster_path.lstrip("/") if poster_path else "",
        "overview": overview,
        "tmdb_rating": vote_avg,
        "tmdb_rating_note": rating_note,
        "year": year,
        "tmdbId": tmdb_id,
        "full_cast": full_cast
    }

    movies.append(movie_data)
    existing_ids.add(movie_id)

    if len(movies) % 50 == 0:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(movies, f, indent=2)
        print(f"💾 Saved {len(movies)} movies")

    time.sleep(0.25)

# ✅ Final save
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(movies, f, indent=2)

print(f"✅ Completed! Total movies saved: {len(movies)}")
