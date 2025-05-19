let numOfPokemon = 3;
let pokemonCache = {}; // Cache to store already fetched Pokémon

async function loadPokemonCards(num_of_pokemon) {
  const maxPokemon = 1025;
  const randomIds = [];
  while (randomIds.length < num_of_pokemon) {
    const rand = Math.floor(Math.random() * maxPokemon) + 1;
    if (!randomIds.includes(rand)) randomIds.push(rand);
  }

  const pokemonData = [];
  for (const id of randomIds) {
    if (pokemonCache[id]) {
      pokemonData.push(pokemonCache[id]);
    } else {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const jsonObj = await response.json();
      const pokeObj = {
        name: jsonObj.name,
        image: jsonObj.sprites.other['official-artwork'].front_default,
        shiny: jsonObj.sprites.other['official-artwork'].front_shiny
      };
      pokemonCache[id] = pokeObj;
      pokemonData.push(pokeObj);
    }
  }

  // Choose one random card to be shiny
  const shinyPairIdx = Math.floor(Math.random() * num_of_pokemon);
  const shinyCardIsA = Math.random() < 0.5;

  // Create pairs of cards (each pokemon appears twice)
  const cards = [];
  pokemonData.forEach((poke, idx) => {
    if (idx === shinyPairIdx) {
      cards.push({
        id: `poke${idx}_a`,
        image: shinyCardIsA ? poke.shiny : poke.image,
        isShiny: shinyCardIsA
      });
      cards.push({
        id: `poke${idx}_b`,
        image: !shinyCardIsA ? poke.shiny : poke.image,
        isShiny: !shinyCardIsA
      });
    } else {
      cards.push({
        id: `poke${idx}_a`,
        image: poke.image,
        isShiny: false
      });
      cards.push({
        id: `poke${idx}_b`,
        image: poke.image,
        isShiny: false
      });
    }
  });

  // Shuffle the cards array
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // Build HTML for the cards
  let cardsHtml = "";
  cards.forEach(card => {
    cardsHtml += `
      <div class="card" ${card.isShiny ? 'data-shiny="true"' : ''}>
        <img id="${card.id}" class="front_face" src="${card.image}" alt="pokemon">
        <img class="back_face" src="back.webp" alt="back">
      </div>
    `;
  });

  // Insert cards into the game grid
  $("#game_grid").html(cardsHtml);
}

let timerInterval;

function setup() {
  // Hide game grid and stats until game starts
  $("#game_grid").hide();
  $(".game_container").hide();
  $("#menu").show();

  // Difficulty selection
  let selectedDifficulty = "easy";
  numOfPokemon = 3;

  $("#difficulty_selector button").on("click", function () {
    selectedDifficulty = $(this).attr("id");
    $("#difficulty_selector button").removeClass("selected");
    $(this).addClass("selected");
    if (selectedDifficulty === "easy") numOfPokemon = 3;
    else if (selectedDifficulty === "medium") numOfPokemon = 6;
    else if (selectedDifficulty === "hard") numOfPokemon = 10;
  });

  // On page load, apply dark mode if previously set
  if (localStorage.getItem("dark_mode") === "true") {
    $("body").addClass("dark-mode");
    $("#dark_mode").prop("checked", true);
  }

  $("#dark_mode").on("change", function () {
    if ($(this).is(":checked")) {
      $("body").addClass("dark-mode");
      localStorage.setItem("dark_mode", "true");
    } else {
      $("body").removeClass("dark-mode");
      localStorage.setItem("dark_mode", "false");
    }
  });

  // Start Game button
  let gameStarted = false;
  $("#start_game").on("click", async function () {
    if (gameStarted) return;
    gameStarted = true;
    $(".game_container").show();
    $("#game_grid").show();

    // Set grid class based on difficulty
    $("#game_grid").removeClass("easy medium hard");
    if (numOfPokemon === 3) {
      $("#game_grid").addClass("easy");
    } else if (numOfPokemon === 6) {
      $("#game_grid").addClass("medium");
    } else if (numOfPokemon === 10) {
      $("#game_grid").addClass("hard");
    }

    await loadPokemonCards(numOfPokemon);
    startGame(numOfPokemon);
  });

  // Reset Game button
  $("#reset_game").on("click", function () {
    location.reload();
  });
}

function startGame(numOfPokemon) {
  let timeLeft;
  if (numOfPokemon === 3) {
    timeLeft = 60; // 1 minute for easy
  } else if (numOfPokemon === 6 || numOfPokemon === 10) {
    timeLeft = 120; // 2 minutes for medium and hard
  } else {
    timeLeft = 60; // default fallback
  }
  let minutes = Math.floor(timeLeft / 60);
  let seconds = timeLeft % 60;
  $("#timer").text(`Time: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
  timerInterval = setInterval(() => {
    timeLeft--;
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    $("#timer").text(`Time: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      $("#timer").text("Time: 0:00");
      showGameOverPopup();
      $(".card").off("click");
    }
  }, 1000);

  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;
  let clickCount = 0;
  const totalPairs = numOfPokemon;
  let pairsMatched = 0;

  function updateStats() {
    $("#click_count").text(`Clicks: ${clickCount}`);
    $("#pairs_left").text(`Pairs Left: ${totalPairs - pairsMatched}`);
    $("#pairs_matched").text(`Pairs Matched: ${pairsMatched}`);
    $("#total_pairs").text(`Total Pairs: ${totalPairs}`);
  }
  updateStats();

  $(".card").on("click", function () {
    // SHINY ALERT FEATURE
    if ($(this).attr("data-shiny") === "true" && !$(this).hasClass("flip")) {
      alert("shiny!");

      // Flip all unmatched cards except the shiny card itself
      const unmatched = $(".card").not(".matched").not(this);
      unmatched.addClass("flip");

      // If this shiny is the second card selected and doesn't match the first, handle special reset
      if (firstCard) {
        const shinyCard = $(this);
        const shinyImg = shinyCard.find(".front_face")[0];
        function getBaseId(img) {
          return img.id.split('_')[0];
        }
        if (getBaseId(firstCard) !== getBaseId(shinyImg)) {
          // Flip the shiny card (since it's the second card)
          shinyCard.addClass("flip");
          lockBoard = true;
          setTimeout(() => {
            unmatched.not(".matched").removeClass("flip");
            shinyCard.removeClass("flip");
            $(firstCard).parent().removeClass("flip");
            firstCard = null;
            secondCard = null;
            lockBoard = false;
          }, 1000);
          return;
        }
      }

      setTimeout(() => {
        unmatched.not(".matched").removeClass("flip");
      }, 1000);
      // Do NOT return here, allow normal flip logic to continue so shiny stays flipped
    }

    if (lockBoard) return;
    if ($(this).hasClass("flip")) return;

    $(this).toggleClass("flip");
    clickCount++;
    updateStats();

    if (!firstCard) {
      firstCard = $(this).find(".front_face")[0];
      return;
    }

    secondCard = $(this).find(".front_face")[0];

    function getBaseId(img) {
      return img.id.split('_')[0];
    }

    if (getBaseId(firstCard) === getBaseId(secondCard)) {
      $(`#${firstCard.id}`).parent().off("click");
      $(`#${secondCard.id}`).parent().off("click");
      $(`#${firstCard.id}`).parent().addClass("matched");
      $(`#${secondCard.id}`).parent().addClass("matched");

      pairsMatched++;
      updateStats();

      const allCards = $(".card");
      const allMatched = allCards.length === $(".matched").length;
      if (allMatched) {
        showWinPopup();
        clearInterval(timerInterval);
      }
      resetBoard();
    } else {
      lockBoard = true;
      setTimeout(() => {
        $(`#${firstCard.id}`).parent().toggleClass("flip");
        $(`#${secondCard.id}`).parent().toggleClass("flip");
        resetBoard();
      }, 1000);
    }

    function resetBoard() {
      [firstCard, secondCard] = [null, null];
      lockBoard = false;
    }
  });
}

function showWinPopup() {
  const popup = $("<div class='popup'>You Win! <button class='play-again'>Play Again</button></div>");
  popup.find(".play-again").on("click", function () {
    location.reload();
  });
  $("body").append(popup);
}

function showGameOverPopup() {
  const popup = $("<div class='popup'>Game Over! <button class='play-again'>Play Again</button></div>");
  popup.find(".play-again").on("click", function () {
    location.reload();
  });
  $("body").append(popup);
}

$(document).ready(setup);