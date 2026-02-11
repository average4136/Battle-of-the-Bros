// main.js

// init variable to get list of user games

games = `minecraft
terarria
wordle
chess
monopoly`

gameList = games.split('\n');
console.log(gameList)
function showGames() {
    for (game in gameList) {
        console.log(game)
    };
};