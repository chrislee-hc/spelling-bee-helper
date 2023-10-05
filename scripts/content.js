// so far:
// 1. collects and parses hints
// 2. collects found words (except potentially on later pages)
// TODO
// 1. parse found words and arrange into desired format
// 2. display found vs. hinted word counts
// 3. update on every event (page update)
// 4. ui

main();

// console.log("asdf");
// document.addEventListener("DOMContentLoaded", function () {
//   // Your code here
//   console.log("JavaScript code rerun when DOM content is loaded");
//   // main();
// });

function main() {
  const hints = document.getElementsByClassName("pz-toolbar-button__hints")[0]
    .href;
  if (hints) {
    fetch(hints)
      .then((response) => response.text())
      .then((html) => {
        analyze(html);
      });
  }
}

function analyze(html) {
  hintsData = analyzeHintsPage(html);
  analyzeGuessesPage().then((guesses) => console.log(guesses));
}

function formatLettersTable(table) {
  const lettersTable = {};
  for (let i = 1; i < table.rows.length - 1; i++) {
    const row = table.rows[i];
    const rowData = [];
    const letter = row.cells[0].getElementsByTagName("span")[0].textContent;
    for (let j = 1; j < row.cells.length; j++) {
      const num = row.cells[j].textContent;
      if (num == "-") {
        rowData.push(0);
      } else {
        rowData.push(parseInt(num));
      }
      lettersTable[letter] = rowData;
    }
  }
  return lettersTable;
}

function formatTotalWordNumbers(str) {
  const regex =
    /WORDS: (\d+), POINTS: (\d+), PANGRAMS: (\d+) \((\d+) Perfect\)/;
  const match = str.match(regex);

  if (match) {
    return {
      words: parseInt(match[1]),
      points: parseInt(match[2]),
      pangrams: parseInt(match[3]),
      perfect_pangrams: parseInt(match[4]),
    };
  } else {
    return null; // Return null if the string format doesn't match
  }
}

function formatTwoLetterNumbers(text) {
  let out = {};
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  for (const line of lines) {
    const first_char = line[0];
    const tokens = line
      .split(first_char)
      .filter((token) => token.trim().length > 0)
      .map((str) => str.trim().split("-"));
    const cur_tokens = {};
    for (const [key, value] of tokens) {
      cur_tokens[key] = parseInt(value);
    }
    out[first_char] = cur_tokens;
  }
  return out;
}

function analyzeHintsPage(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const table = doc.getElementsByClassName("table")[0];
  const lettersTable = formatLettersTable(table);

  const textsToParse = Array.from(doc.querySelectorAll("p.content"));
  const totalWordsNumbers = formatTotalWordNumbers(
    textsToParse[2].textContent.trim()
  );
  const twoLetterNumbers = formatTwoLetterNumbers(
    textsToParse[4].textContent.trim()
  );

  console.log(lettersTable);
  console.log(totalWordsNumbers);
  console.log(twoLetterNumbers);

  return {
    lettersTable: lettersTable,
    totalWordsNumbers: totalWordsNumbers,
    twoLetterNumbers: twoLetterNumbers,
  };
}

function analyzeGuessesPage() {
  return new Promise((resolve) => {
    setTimeout(() => {
      let guesses = Array.from(
        document.querySelectorAll("span.sb-anagram")
      ).map((g) => g.textContent.trim());
      if (guesses.length % 2 != 0) {
        throw new Error(
          "Something went wrong with the number of guesses; \
      the page format may have changed? Contact a dev."
        );
      }
      guesses = guesses.slice(0, guesses.length / 2);
      resolve(guesses);
    }, 1000);
  });
}
