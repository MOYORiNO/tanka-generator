// ===============================
//  初期データ
// ===============================
let phrases5 = []
let phrases7 = []

// 連続投稿防止（30秒）
let lastPostTime = 0

let tokenizer = null;

// kuromoji の初期化
kuromoji.builder({ dicPath: "dict" }).build((err, t) => {
  if (err) {
    console.error("kuromoji の初期化に失敗:", err);
    return;
  }
  tokenizer = t;
  console.log("✅ kuromoji 初期化完了");
});

// ===============================
//  JSON + LocalStorage 読み込み
// ===============================
function loadUserPhrases() {
  const user5 = JSON.parse(localStorage.getItem("userPhrases5") || "[]")
  const user7 = JSON.parse(localStorage.getItem("userPhrases7") || "[]")

  phrases5 = phrases5.concat(user5)
  phrases7 = phrases7.concat(user7)
}

function saveUserPhrase(type, phrase) {
  const key = type === "5" ? "userPhrases5" : "userPhrases7"
  const list = JSON.parse(localStorage.getItem(key) || "[]")
  list.push(phrase)
  localStorage.setItem(key, JSON.stringify(list))
}


// ===============================
//  Firestore リアルタイム監視
// ===============================
function startRealtimeListener() {
  const q = collection(db, "phrases")

  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(change => {
      if (change.type === "added") {
        const data = change.doc.data()

        // 重複追加を防ぐ
        if (data.type === "5" && !phrases5.includes(data.text)) {
          phrases5.push(data.text)
        }
        if (data.type === "7" && !phrases7.includes(data.text)) {
          phrases7.push(data.text)
        }
      }
    })

    console.log("✅ リアルタイム更新：phrases が更新されました")
  })
}


// ===============================
//  Firestore 保存
// ===============================

async function savePhraseToCloud(type, phrase) {
   await setDoc(doc(db, "phrases", phrase), {
    type: type,
    text: phrase,
    createdAt: Date.now()
  });
}



function getReading(text) {
  if (!tokenizer) return null;

  const tokens = tokenizer.tokenize(text);
  return tokens
    .map(t => t.reading || t.surface_form) // 読みがない場合は原文
    .join("");
}
function countMora(kana) {
  // カタカナと長音符だけを対象にする
  return kana.replace(/[^ァ-ンー]/g, "").length;
}


// ===============================
//  バリデーション（スパム対策）
// ===============================
async function validatePhrase(phrase, type) {
  if (!tokenizer) {
    console.warn("tokenizer がまだ初期化されていません");
    return false;
  }

  // 読み（カタカナ）を取得
  const reading = getReading(phrase);
  if (!reading) return false;

  // 音数を数える
  const mora = countMora(reading);

  console.log("読み:", reading, "音数:", mora);

  // ✅ 5音 → ちょうど5モーラ
  if (type === "5" && mora !== 5) return false;

  // ✅ 7音 → 7〜8モーラを許可
  if (type === "7" && !(mora === 7 || mora === 8)) return false;

  return true;
}




// ===============================
//  ランダム短歌生成
// ===============================
function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function generateTanka() {
  const line1 = randomPick(phrases5)
  const line2 = randomPick(phrases7)
  const line3 = randomPick(phrases5)
  const line4 = randomPick(phrases7)
  const line5 = randomPick(phrases7)

  document.getElementById("line1").textContent = line1
  document.getElementById("line2").textContent = line2
  document.getElementById("line3").textContent = line3
  document.getElementById("line4").textContent = line4
  document.getElementById("line5").textContent = line5

  document.getElementById("tanka").classList.remove("hidden")
}

document.getElementById("generateBtn").addEventListener("click", generateTanka)


// ===============================
//  フレーズ追加処理
// ===============================
document.getElementById("addBtn").addEventListener("click", async () => {
  const type = document.getElementById("type").value
  const phrase = document.getElementById("newPhrase").value.trim()

  if (!validatePhrase(phrase, type)) {
    document.getElementById("addMessage").textContent =
      "使用できない文字、または長すぎるフレーズです。"
    return
  }

  // ✅ 重複チェック（ここを追加）
  if (type === "5" && phrases5.includes(phrase)) {
    document.getElementById("addMessage").textContent =
      "この5音フレーズはすでに登録されています。"
    return
  }
  if (type === "7" && phrases7.includes(phrase)) {
    document.getElementById("addMessage").textContent =
      "この7音フレーズはすでに登録されています。"
    return
  }

  // 連続投稿防止（30秒）
  const now = Date.now()
  if (now - lastPostTime < 30000) {
    document.getElementById("addMessage").textContent =
      "連続投稿は30秒あけてください。"
    return
  }
  lastPostTime = now

  // メモリに追加
  if (type === "5") phrases5.push(phrase)
  else phrases7.push(phrase)

  // LocalStorage に保存
  saveUserPhrase(type, phrase)

  // Firestore に保存
  await savePhraseToCloud(type, phrase)

  document.getElementById("addMessage").textContent = "追加しました！（共有されます）"
  document.getElementById("newPhrase").value = ""
})


// ===============================
//  アプリ起動時：JSON → LocalStorage → Firestore（リアルタイム）
// ===============================
fetch("data/phrase.json")
  .then(res => res.json())
  .then(async data => {
    phrases5 = data.phrases5
    phrases7 = data.phrases7

    loadUserPhrases() // LocalStorage

    // ✅ Firestore のリアルタイム監視を開始
    startRealtimeListener()

    console.log("✅ 初期データ読み込み完了（リアルタイム監視開始）")
  })
