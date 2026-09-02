(() => {
  "use strict";

  function init() {
    const panel=document.querySelector(".results-panel"),summary=document.querySelector("#results-summary"),history=document.querySelector("#guess-history");
    if(!panel||!summary||!history)return;

    const boardCount=document.querySelectorAll(".feedback-board-card").length;
    const guessLimit=boardCount===4?9:boardCount===8?13:21;
    const wrap=document.createElement("div"),status=document.createElement("p");
    wrap.className="analysis-progress";
    status.className="analysis-update-status";
    status.setAttribute("aria-live","polite");
    status.textContent="Analysis ready";

    const makeMeter=(label,max)=>{
      const item=document.createElement("div"),heading=document.createElement("span"),name=document.createElement("span"),value=document.createElement("strong"),bar=document.createElement("progress");
      item.className="analysis-progress-item";
      name.textContent=label;
      heading.append(name,value);
      bar.max=max;
      bar.value=0;
      item.append(heading,bar);
      wrap.append(item);
      return {item,value,bar};
    };

    const guessMeter=makeMeter("Shared guesses",guessLimit),boardMeter=makeMeter("Boards solved",boardCount);
    summary.after(wrap,status);

    const updateProgress=()=>{
      const guesses=Number(history.dataset.guessCount)||0;
      const solved=[...document.querySelectorAll(".board-complete")].filter(button=>button.getAttribute("aria-pressed")==="true").length;
      const remainingGuesses=Math.max(0,guessLimit-guesses),unsolved=boardCount-solved;
      const forcedAnswers=new Set([...document.querySelectorAll(".board-result")].flatMap(card=>{
        if(card.dataset.solved==="true"||!/^1 left$/.test(card.querySelector(".board-status")?.textContent.trim()||""))return [];
        const word=card.querySelector(".candidate-list button")?.textContent.trim();
        return word?[word]:[];
      }));
      const feasibility=unsolved>0&&(remainingGuesses===0||forcedAnswers.size>remainingGuesses)?"impossible":unsolved>0&&remainingGuesses<=unsolved?"at-risk":"on-track";
      const feasibilityLabel={"on-track":"On track","at-risk":"At risk","impossible":"Impossible"}[feasibility];
      summary.hidden=guesses>0;
      guessMeter.bar.value=guesses;
      guessMeter.value.textContent=`${guesses} of ${guessLimit} · ${feasibilityLabel}`;
      guessMeter.item.dataset.feasibility=feasibility;
      guessMeter.item.setAttribute("aria-label",`Shared guesses: ${guesses} of ${guessLimit}. Solve feasibility: ${feasibilityLabel}.`);
      boardMeter.bar.value=solved;
      boardMeter.value.textContent=`${solved} of ${boardCount}`;
    };

    let updateFrame=0;
    const announceUpdate=()=>{
      status.textContent="Recalculating analysis…";
      cancelAnimationFrame(updateFrame);
      updateFrame=requestAnimationFrame(()=>{
        updateProgress();
        status.textContent="Analysis updated";
      });
    };

    document.addEventListener("click",event=>{
      if(event.target.closest("#add-guess,#clear-guesses,.guess-history button,.board-complete,.shared-guess-menu-panel button,.session-history button"))announceUpdate();
    },true);
    document.addEventListener("change",event=>{
      if(event.target.matches("#word-length,input[name='dictionary']"))announceUpdate();
    },true);
    new MutationObserver(updateProgress).observe(history,{childList:true});
    new MutationObserver(updateProgress).observe(document.querySelector(".feedback-grid"),{subtree:true,attributes:true,attributeFilter:["aria-pressed"]});
    updateProgress();
  }

  if(document.readyState==="loading")window.addEventListener("DOMContentLoaded",init);
  else init();
})();
