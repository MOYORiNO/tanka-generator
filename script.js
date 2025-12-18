let phrases5 = [];
let phrases7 = [];

// JSONファイルを読み込む
fetch("data/phrases.json")
  .then(response => response.json())
  .then(data => {
    phrases5 = data.phrases5;
    phrases7 = data.phrases7;

    // LocalStorage のデータを上乗せ
    loadUserPhrases();
  });

function loadUserPhrases() {
  const user5 = JSON.parse(localStorage.getItem("userPhrases5") || "[]");
  const user7 = JSON.parse(localStorage.getItem("userPhrases7") || "[]");

  phrases5 = phrases5.concat(user5);
  phrases7 = phrases7.concat(user7);
}

function saveUserPhrase(type, phrase) {
  const key = type === "5" ? "userPhrases5" : "userPhrases7";
  const list = JSON.parse(localStorage.getItem(key) || "[]");
  list.push(phrase);
  localStorage.setItem(key, JSON.stringify(list));
}

function randomPick(array) {
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

function generateTanka() {
  const line1 = randomPick(phrases5);
  const line2 = randomPick(phrases7);
  const line3 = randomPick(phrases5);
  const line4 = randomPick(phrases7);
  const line5 = randomPick(phrases7);

  document.getElementById("line1").textContent = line1;
  document.getElementById("line2").textContent = line2;
  document.getElementById("line3").textContent = line3;
  document.getElementById("line4").textContent = line4;
  document.getElementById("line5").textContent = line5;

  document.getElementById("tanka").classList.remove("hidden");
}

document.getElementById("generateBtn").addEventListener("click", generateTanka);

// フレーズ追加処理
document.getElementById("addBtn").addEventListener("click", () => {
  const type = document.getElementById("type").value;
  const phrase = document.getElementById("newPhrase").value.trim();

  if (!phrase) {
    document.getElementById("addMessage").textContent = "フレーズを入力してください。";
    return;
  }

  // メモリ上の配列にも追加
  if (type === "5") {
    phrases5.push(phrase);
  } else {
    phrases7.push(phrase);
  }

  // LocalStorage に保存
  saveUserPhrase(type, phrase);

  document.getElementById("addMessage").textContent = "追加しました！";
  document.getElementById("newPhrase").value = "";
});
