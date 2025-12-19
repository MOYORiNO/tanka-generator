// ===============================
//  初期データ
// ===============================
let phrases5 = []
let phrases7 = []

// 連続投稿防止（30秒）
let lastPostTime = 0


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

async function savePhraseToCloud(type, phrase, reading) {
  await setDoc(doc(db, "phrases", phrase), {
    type: type,
    text: phrase,
    reading: reading,
    createdAt: Date.now()
  });
}







// ===============================
//  バリデーション（スパム対策）
// ===============================
function countMora(kana) {
  return kana.replace(/[^ぁ-んー]/g, "").length;
}

function validatePhrase(phrase, reading, type) {
  // 読みはひらがなのみ
  if (!/^[ぁ-んー]+$/.test(reading)) return false;

  const mora = countMora(reading);

  // 5音句
  if (type === "5" && mora !== 5) return false;

  // 7音句（7〜8モーラ許可）
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
  const reading = document.getElementById("readingInput").value.trim()  // ✅ 読みを取得

  // ✅ 読みを使った音数チェック
  if (!validatePhrase(phrase, reading, type)) {
    document.getElementById("addMessage").textContent =
      "読みが正しくありません。（ひらがなで5音/7〜8音）"
    return
  }

  // ✅ 重複チェック（フレーズ本体で判定）
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

  // ✅ 連続投稿防止（30秒）
  const now = Date.now()
  if (now - lastPostTime < 30000) {
    document.getElementById("addMessage").textContent =
      "連続投稿は30秒あけてください。"
    return
  }
  lastPostTime = now

  // ✅ メモリに追加
  if (type === "5") phrases5.push(phrase)
  else phrases7.push(phrase)

  // ✅ LocalStorage に保存（読みも保存したいならここも変更可能）
  saveUserPhrase(type, phrase)

  // ✅ Firestore に保存（読みも送る）
  await savePhraseToCloud(type, phrase, reading)

  document.getElementById("addMessage").textContent = "追加しました！（共有されます）"
  document.getElementById("newPhrase").value = ""
  document.getElementById("readingInput").value = ""  // ✅ 読み欄もクリア
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
