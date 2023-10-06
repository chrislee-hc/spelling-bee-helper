// so far:
// 1. collects and parses hints
// 2. collects found words (except potentially on later pages)
// TODO
// 1. parse found words and arrange into desired format
// 2. display found vs. hinted word counts
// 3. update on every event (page update)
// 4. ui

main();

function handleMutations(mutationsList) {
  // console.log("start");
  // console.log(mutationsList);
  for (let mutation of mutationsList) {
    if (
      mutation.type === "childList" &&
      mutation.target.classList.contains("sb-wordlist-items-pag")
    ) {
      const nodesWithClass = Array.from(mutation.addedNodes).filter((node) => {
        return node.nodeType === 1 && node.tagName.toLowerCase() === "li";
      });
      // console.log(nodesWithClass.map((node) => node.textContent));
      if (nodesWithClass.length > 0) {
        main();
      }
    }
  }
  // console.log("end");
}

const observer = new MutationObserver(handleMutations);

// Start observing changes in the document
observer.observe(document, { childList: true, subtree: true });

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

async function analyze(html) {
  const hintsData = analyzeHintsPage(html);
  const guessesData = await analyzeGuessesPage();
  let out = {};
  for (const objKey in hintsData) {
    out[objKey] = {};
    if (objKey == "totalWordsNumbers") {
      for (const category in hintsData[objKey]) {
        out[objKey][category] = [
          guessesData[objKey][category],
          hintsData[objKey][category],
        ];
      }
    } else {
      for (const k1 in hintsData[objKey]) {
        out[objKey][k1] = {};
        for (const k2 in hintsData[objKey][k1]) {
          if (k1 in guessesData[objKey] && k2 in guessesData[objKey][k1]) {
            out[objKey][k1][k2] = [
              guessesData[objKey][k1][k2],
              hintsData[objKey][k1][k2],
            ];
          } else {
            out[objKey][k1][k2] = [0, hintsData[objKey][k1][k2]];
          }
        }
      }
    }
  }
  console.log("logging out");
  console.log(out);
  return out;
}

function formatLettersTable(table) {
  const lettersTable = {};
  let wordLengths = Array.from(table.rows[0].cells)
    .slice(1)
    .map((content) => content.textContent);
  for (let i = 1; i < table.rows.length - 1; i++) {
    const row = table.rows[i];
    let rowData = {};
    const letter = row.cells[0].getElementsByTagName("span")[0].textContent;
    for (let j = 1; j < row.cells.length; j++) {
      const num = row.cells[j].textContent;
      if (num == "-") {
        rowData[wordLengths[j - 1]] = 0;
      } else {
        rowData[wordLengths[j - 1]] = parseInt(num);
      }
      lettersTable[letter] = rowData;
    }
  }
  return lettersTable;
}

function formatTotalWordNumbers(str) {
  const regex =
    /WORDS: (\d+), POINTS: (\d+), PANGRAMS: (\d+)(?: \((\d+) Perfect\))?/;
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

  // console.log("lettersTable");
  // console.log(lettersTable);
  // console.log("totalWordsNumbers");
  // console.log(totalWordsNumbers);
  // console.log("twoLetterNumbers");
  // console.log(twoLetterNumbers);

  return {
    lettersTable: lettersTable,
    totalWordsNumbers: totalWordsNumbers,
    twoLetterNumbers: twoLetterNumbers,
  };
}

function getTotalWordsNumbers(word_list) {
  let out = {
    words: 0,
    points: 0,
    pangrams: 0,
    perfect_pangrams: 0,
  };
  for (let word of word_list) {
    out["words"]++;
    if (word.length == 4) {
      out["points"]++;
    } else {
      out["points"] += word.length;
    }
    const charSet = new Set();
    for (const char of word) {
      charSet.add(char);
    }
    if (charSet.size == 7) {
      out["points"] += 7;
      out["pangrams"];
      if (word.length == 7) {
        out["perfect_pangrams"]++;
      }
    }
  }
  return out;
}

function getTwoLetterNumbers(word_list) {
  out = {};
  for (let word of word_list) {
    if (!(word[0] in out)) {
      out[word[0]] = {};
    }
    if (!(word[1] in out[word[0]])) {
      out[word[0]][word[1]] = 0;
    }
    out[word[0]][word[1]]++;
  }
  return out;
}

function getLettersTable(word_list) {
  out = {};
  for (let word of word_list) {
    if (!(word[0] in out)) {
      out[word[0]] = {};
    }
    if (!(word.length in out[word[0]])) {
      out[word[0]][word.length] = 0;
    }
    out[word[0]][word.length]++;
  }
  return out;
}

function getGuesses() {
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

async function analyzeGuessesPage() {
  const guesses = await getGuesses();
  return {
    totalWordsNumbers: getTotalWordsNumbers(guesses),
    twoLetterNumbers: getTwoLetterNumbers(guesses),
    lettersTable: getLettersTable(guesses),
  };
}
