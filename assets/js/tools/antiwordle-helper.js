"use strict";
(function initAntiwordleHelper(){
  const Engine=window.MonkeyTacticsWasm;if(!Engine)return;
  const input=document.querySelector("#guess-input"),tiles=[...document.querySelectorAll("#feedback-tiles button")],add=document.querySelector("#add-guess"),message=document.querySelector("#guess-message"),history=document.querySelector("#guess-history"),historyWrap=document.querySelector("#guess-history-wrap"),clear=document.querySelector("#clear-guesses"),heading=document.querySelector("#candidate-heading"),summary=document.querySelector("#candidate-summary"),list=document.querySelector("#candidate-list"),placeholder=document.querySelector("#candidate-placeholder"),panel=document.querySelector("#candidate-panel"),keyboard=document.querySelector("#antiwordle-keyboard"),nextGuessCard=document.querySelector("#next-guess-card"),nextGuessWord=document.querySelector("#next-guess-word"),nextGuessMetrics=document.querySelector("#next-guess-metrics");
  const states=["neutral","absent","present","correct"],labels={neutral:"not marked",absent:"gray, eliminated",present:"yellow, required in another position",correct:"red, locked in this position"},allWords=new Map();
  let feedback=Array(5).fill("neutral"),guesses=[],dictionaryReady=false,recommendedWord="";
  const clean=value=>value.toLowerCase().replace(/[^a-z]/g,"").slice(0,5);
  const selectedDictionary=()=>Number(document.querySelector('input[name="dictionary"]:checked').value);
  function hideMessage(){message.hidden=true}
  function showMessage(text){message.textContent=text;message.hidden=false}
  async function decode(response){const bytes=new Uint8Array(await response.arrayBuffer());if(bytes[0]!==31||bytes[1]!==139)return new TextDecoder().decode(bytes);const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));return new Response(stream).text()}
  async function loadDictionary(){await Engine.ready;const manifest=await fetch("/assets/data/words/manifest.enable-v1.json").then(r=>{if(!r.ok)throw new Error("manifest");return r.json()});await Promise.all(Object.values(manifest.chunks).map(async chunk=>{const response=await fetch(`/assets/data/words/${chunk.file}`);if(!response.ok)throw new Error("chunk");Engine.initEngine((await decode(response)).split(/\r?\n/).filter(Boolean))}));dictionaryReady=true;add.disabled=false;add.textContent="Add feedback & find safe guesses";search()}
  function constraints(){
    const locked=Array(5).fill(""),blocked=Array.from({length:5},()=>new Set()),minimum={},maximum={};
    guesses.forEach(row=>{
      const rowMinimum={},rowHasGray={};
      row.word.split("").forEach((letter,index)=>{
        const state=row.feedback[index];
        if(state==="correct")locked[index]=letter;
        if(state==="present")blocked[index].add(letter);
        if(state==="present"||state==="correct")rowMinimum[letter]=(rowMinimum[letter]||0)+1;
        if(state==="absent")rowHasGray[letter]=true;
      });
      new Set(row.word).forEach(letter=>{
        const count=rowMinimum[letter]||0;
        minimum[letter]=Math.max(minimum[letter]||0,count);
        if(rowHasGray[letter])maximum[letter]=maximum[letter]===undefined?count:Math.min(maximum[letter],count);
      });
    });
    return{locked,blocked,minimum,maximum};
  }
  function legalWord(word){
    const rules=constraints(),counts={};[...word].forEach(letter=>counts[letter]=(counts[letter]||0)+1);
    for(let index=0;index<5;index++){if(rules.locked[index]&&word[index]!==rules.locked[index])return false;if(rules.blocked[index].has(word[index]))return false}
    if(Object.entries(rules.minimum).some(([letter,count])=>(counts[letter]||0)<count))return false;
    return !Object.entries(rules.maximum).some(([letter,count])=>(counts[letter]||0)>count);
  }
  function scoreGuess(answer,guess){const result=Array(5).fill("absent"),remaining={};for(let i=0;i<5;i++){if(guess[i]===answer[i])result[i]="correct";else remaining[answer[i]]=(remaining[answer[i]]||0)+1}for(let i=0;i<5;i++){if(result[i]==="correct")continue;const letter=guess[i];if(remaining[letter]>0){result[i]="present";remaining[letter]--}}return result}
  function answerStats(words){const presence={},positions=Array.from({length:5},()=>({})),total=Math.max(words.length,1);words.forEach(word=>{new Set(word).forEach(letter=>presence[letter]=(presence[letter]||0)+1);[...word].forEach((letter,index)=>positions[index][letter]=(positions[index][letter]||0)+1)});return{presence,positions,total}}
  const entropy=p=>p<=0||p>=1?0:-p*Math.log2(p)-(1-p)*Math.log2(1-p);
  function avoidanceScore(word,stats){const information=[...new Set(word)].reduce((sum,letter)=>sum+entropy((stats.presence[letter]||0)/stats.total),0)+[...word].reduce((sum,letter,index)=>sum+entropy((stats.positions[index][letter]||0)/stats.total),0);return information}
  function selectWord(word){input.value=word.toUpperCase();feedback=Array(5).fill("neutral");syncTiles();hideMessage();input.focus()}
  function syncTiles(){const word=clean(input.value);historyWrap.classList.toggle("has-active-guess",word.length>0);tiles.forEach((tile,index)=>{tile.textContent=(word[index]||"–").toUpperCase();tile.className=feedback[index];tile.setAttribute("aria-label",`${word[index]||`Letter ${index+1}`}: ${labels[feedback[index]]}`)});updateKeyboard()}
  function updateKeyboard(){
    const rules=constraints(),required=new Set(Object.keys(rules.minimum)),locked=new Set(rules.locked.filter(Boolean));
    keyboard.querySelectorAll("[data-letter]").forEach(key=>{const letter=key.dataset.letter;delete key.dataset.state;key.disabled=false;if(rules.maximum[letter]===0){key.dataset.state="absent";key.disabled=true}else if(locked.has(letter))key.dataset.state="correct";else if(required.has(letter))key.dataset.state="present"});
  }
  function renderHistory(){historyWrap.hidden=!guesses.length;history.replaceChildren(...guesses.map((guess,index)=>{const li=document.createElement("li");li.tabIndex=-1;li.setAttribute("aria-label",`Guess ${index+1}: ${guess.word.toUpperCase()}`);guess.word.split("").forEach((letter,i)=>{const tile=document.createElement("span");tile.className=`mini-tile ${guess.feedback[i]}`;tile.textContent=letter.toUpperCase();li.append(tile)});const actions=document.createElement("span");actions.className="clue-actions";if(index===guesses.length-1){const edit=document.createElement("button");edit.type="button";edit.className="edit-row";edit.textContent="Edit";edit.addEventListener("click",()=>editGuess(index));actions.append(edit)}const remove=document.createElement("button");remove.type="button";remove.className="remove-row";remove.textContent="Remove";remove.addEventListener("click",()=>{guesses.splice(index,1);renderHistory();search()});actions.append(remove);li.append(actions);return li}));updateKeyboard()}
  function editGuess(index){const edited=guesses.splice(index,1)[0];if(!edited)return;input.value=edited.word.toUpperCase();feedback=[...edited.feedback];renderHistory();syncTiles();search();input.focus()}
  function search(){
    if(!dictionaryReady)return;panel.setAttribute("aria-busy","true");const dictionary=selectedDictionary();
    if(!allWords.has(dictionary))allWords.set(dictionary,Engine.wordleSearch([],dictionary));
    const words=allWords.get(dictionary),answers=Engine.wordleSearch(guesses.map(row=>({word:row.word,feedback:row.feedback.map(state=>state[0]).join("")})),dictionary),stats=answerStats(answers);
    const ranked=words.filter(legalWord).map(word=>({word,information:avoidanceScore(word,stats)})).sort((a,b)=>a.information-b.information||a.word.localeCompare(b.word));
    heading.textContent=guesses.length?`${ranked.length.toLocaleString()} legal ${ranked.length===1?"guess":"guesses"}`:"Ready for your first guess";
    summary.textContent=guesses.length?`${answers.length.toLocaleString()} possible hidden ${answers.length===1?"answer remains":"answers remain"}. Legal choices are ranked from lower to higher expected information.`:"Add feedback from Antiwordle to enforce gray, yellow, and red restrictions.";
    const best=ranked[0];recommendedWord=best?.word||"";nextGuessCard.hidden=!best;if(best){nextGuessWord.textContent=best.word.toUpperCase();nextGuessMetrics.textContent=`Possible answer · about 1 in ${Math.max(answers.length,1).toLocaleString()} uniform risk · avoidance score ${best.information.toFixed(2)}`;nextGuessCard.setAttribute("aria-label",`Use ${best.word.toUpperCase()}, the lowest-information legal guess`)}
    list.replaceChildren(...ranked.slice(0,500).map((entry,index)=>{const li=document.createElement("li"),button=document.createElement("button");button.type="button";button.textContent=entry.word.toUpperCase();button.setAttribute("aria-label",`Rank ${index+1}: ${entry.word.toUpperCase()}, legal possible answer, avoidance score ${entry.information.toFixed(2)}`);button.title=`Legal possible answer · avoidance score ${entry.information.toFixed(2)}`;button.addEventListener("click",()=>selectWord(entry.word));li.append(button);return li}));
    placeholder.hidden=ranked.length>0;placeholder.textContent=ranked.length?"":"No legal dictionary guesses remain. Check the feedback colors, especially repeated letters.";panel.setAttribute("aria-busy","false");
  }
  function addGuess(){const word=clean(input.value);if(word.length!==5){showMessage("Enter exactly five letters first.");input.focus();return}if(guesses.length&&!legalWord(word)){showMessage("That guess breaks an Antiwordle restriction. Use every yellow letter, keep red letters fixed, and avoid eliminated gray letters.");return}const submitted=feedback.map(state=>state==="neutral"?"absent":state);guesses.push({word,feedback:submitted});input.value="";feedback=Array(5).fill("neutral");hideMessage();syncTiles();renderHistory();search();input.focus()}
  function cycleLetterFeedback(letter){const word=clean(input.value),positions=[...word].flatMap((character,index)=>character===letter.toLowerCase()?[index]:[]);if(!positions.length)return false;const next=states[(states.indexOf(feedback[positions[0]])+1)%states.length];positions.forEach(index=>feedback[index]=next);syncTiles();hideMessage();return true}
  input.addEventListener("input",()=>{input.value=clean(input.value).toUpperCase();feedback=Array(5).fill("neutral");syncTiles();hideMessage()});
  tiles.forEach((tile,index)=>tile.addEventListener("click",()=>{if(!clean(input.value)[index])return;feedback[index]=states[(states.indexOf(feedback[index])+1)%states.length];syncTiles()}));
  add.addEventListener("click",addGuess);input.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();addGuess()}else if(!event.repeat&&clean(input.value).length===5&&/^[a-z]$/i.test(event.key)&&cycleLetterFeedback(event.key)){event.preventDefault()}});
  const keyboardRows=["QWERTYUIOP","ASDFGHJKL",["Enter","Z","X","C","V","B","N","M","Backspace"]];keyboardRows.forEach(row=>{const element=document.createElement("div");element.className="keyboard-row";[...row].forEach(key=>{const button=document.createElement("button");button.type="button";button.className=`keyboard-key${key.length>1?" keyboard-key--wide":""}`;button.textContent=key==="Backspace"?"⌫":key;button.setAttribute("aria-label",key);if(key.length===1)button.dataset.letter=key.toLowerCase();button.addEventListener("click",()=>{if(key==="Enter")addGuess();else if(key==="Backspace"){input.value=input.value.slice(0,-1);feedback[clean(input.value).length]="neutral";syncTiles();hideMessage()}else if(input.value.length<5){input.value+=key;syncTiles();hideMessage()}else cycleLetterFeedback(key);input.focus()});element.append(button)});keyboard.append(element)});
  nextGuessCard.addEventListener("click",()=>recommendedWord&&selectWord(recommendedWord));clear.addEventListener("click",()=>{guesses=[];input.value="";feedback=Array(5).fill("neutral");renderHistory();syncTiles();search()});document.querySelectorAll('input[name="dictionary"]').forEach(radio=>radio.addEventListener("change",search));
  loadDictionary().catch(()=>{add.textContent="Dictionary unavailable";showMessage("The word list could not load. Refresh the page to try again.")});syncTiles();
})();
