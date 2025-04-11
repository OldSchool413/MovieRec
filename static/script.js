let allMovies = [];

fetch("/data/movies_full.json")
  .then(res => res.json())
  .then(data => {
    allMovies = data;
    renderGenres();
    loadMoreMovies();
  });

const movieGrid = document.getElementById("movieGrid");
const searchInput = document.getElementById("searchInput");
const genreFilters = document.getElementById("genreFilters");
const sortSelect = document.getElementById("sortSelect");

let visibleCount = 0;
const batchSize = 20;
let filteredGenre = null;
let hasFetchedTMDb = false;

function renderGenres() {
  const genreSet = new Set();
  allMovies.forEach(m => m.genres.split('|').forEach(g => genreSet.add(g)));
  genreFilters.innerHTML = [...genreSet].map(g =>
    `<span class="badge" onclick="filterByGenre('${g}')">${g}</span>`
  ).join('');
}

function filterByGenre(genre) {
  filteredGenre = genre;
  visibleCount = 0;
  movieGrid.innerHTML = '';
  hasFetchedTMDb = false;
  loadMoreMovies();
}

function getStarHTML(rating) {
  const full = Math.floor(rating / 2);
  const half = (rating / 2) - full >= 0.25 && (rating / 2) - full < 0.75;
  let stars = '';

  for (let i = 1; i <= 5; i++) {
    if (i <= full) {
      stars += '<i class="fa fa-star fa-solid"></i>';
    } else if (i === full + 1 && half) {
      stars += '<i class="fa fa-star-half-stroke fa-solid"></i>';
    } else {
      stars += '<i class="fa fa-star fa-regular"></i>';
    }
  }
  return stars;
}

function loadMoreMovies(skipTMDb = false) {
  const query = searchInput.value.toLowerCase();
  const sortValue = sortSelect ? sortSelect.value : "";

  let filtered = allMovies
    .filter(m => m.title.toLowerCase().includes(query))
    .filter(m => !filteredGenre || m.genres.includes(filteredGenre));

  if (sortValue === "rating-asc") {
    filtered.sort((a, b) => (a.tmdb_rating || 0) - (b.tmdb_rating || 0));
  } else if (sortValue === "rating-desc") {
    filtered.sort((a, b) => (b.tmdb_rating || 0) - (a.tmdb_rating || 0));
  } else if (sortValue === "year-asc") {
    filtered.sort((a, b) => (a.year || 0) - (b.year || 0));
  } else if (sortValue === "year-desc") {
    filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
  }

  const visibleMovies = filtered.slice(visibleCount, visibleCount + batchSize);

  // TMDb fallback for no local result
 if (visibleMovies.length === 0 && query && !hasFetchedTMDb && !skipTMDb) {
  hasFetchedTMDb = true;

  // Avoid duplicate results if exact match already exists locally
  const exactMatch = allMovies.find(m => m.title.toLowerCase() === query);
  if (!exactMatch) {
    fetchFromTMDb(query);
  }
  return;
}

  visibleMovies.forEach(movie => {
    const rating = movie.tmdb_rating || 0;
    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
      <a href="/movie?id=${movie.movieId}" class="card-link">
        <img src="https://image.tmdb.org/t/p/w342/${movie.poster_path || ""}" alt="${movie.title}" />
        <div class="overlay">
          <i class="fas fa-plus-circle add-to-wishlist" title="Add to Wishlist" onclick="addToWishlist(${movie.movieId}); event.preventDefault();"></i>
        </div>
        <h4>${movie.title}</h4>
        <p>${movie.genres}</p>
      </a>
      <div class="movie-rating-label">IMDb ${rating.toFixed(1)} / 10</div>
      <div class="stars">${getStarHTML(rating)}</div>
    `;
    movieGrid.appendChild(card);
  });

  visibleCount += batchSize;
}

function fetchFromTMDb(query) {
  const API_KEY = "82949e8e5f0fdee432a981cfb0d77abe";
  fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${API_KEY}`)
    .then(res => res.json())
    .then(async data => {
      if (!data.results || data.results.length === 0) return;

      const topResults = data.results.slice(0, 10); // show top 10 matches

      for (let movie of topResults) {
        const details = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${API_KEY}`)
          .then(r => r.json());

        const rating = details.vote_average || 0;
        const card = document.createElement("div");
        card.className = "movie-card live-result";
        card.innerHTML = `
          <a href="/movie?id=${movie.id}&tmdb=true" class="card-link">
            <img src="https://image.tmdb.org/t/p/w342/${movie.poster_path}" alt="${movie.title}">
            <h4>${movie.title}</h4>
            <p>${details.genres?.map(g => g.name).join(', ') || 'Genre not available'}</p>
            <p class="tmdb-label">Live result from TMDb</p>
            <div class="movie-rating-label">IMDb ${rating.toFixed(1)} / 10</div>
            <div class="stars">${getStarHTML(rating)}</div>
          </a>
        `;
        movieGrid.appendChild(card);
      }
    });
}

function addToWishlist(movieId) {
  const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
  if (!wishlist.includes(movieId)) {
    wishlist.push(movieId);
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
    alert("Added to wishlist!");
  } else {
    alert("Already in wishlist!");
  }
}

function loadPageFresh() {
  movieGrid.innerHTML = '';
  visibleCount = 0;
  hasFetchedTMDb = false;
  loadMoreMovies();
}

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    loadMoreMovies();
  }
});

if (searchInput) searchInput.addEventListener("input", loadPageFresh);
if (sortSelect) sortSelect.addEventListener("change", loadPageFresh);
