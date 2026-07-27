'use strict';

function money(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function rollToColor(roll) {
  const n = Number(roll);
  if (!Number.isInteger(n) || n < 0 || n > 14) return null;
  if (n === 0) return 'white';
  if (n <= 7) return 'red';
  return 'black';
}

function calculateExposure(current) {
  const red = money(current.total_red_bet);
  const black = money(current.total_black_bet);
  const white = money(current.total_white_bet);
  const total = red + black + white;

  const house = {
    red: total - (2 * red),
    black: total - (2 * black),
    white: total - (14 * white)
  };

  const ranked = Object.entries(house).sort((a, b) => b[1] - a[1]);
  const [favoriteColor, favoriteValue] = ranked[0];
  const financialDifference = favoriteValue - ranked[1][1];

  return {
    red,
    black,
    white,
    total,
    houseRed: house.red,
    houseBlack: house.black,
    houseWhite: house.white,
    favoriteColor,
    favoriteValue,
    financialDifference
  };
}

module.exports = { calculateExposure, rollToColor };
