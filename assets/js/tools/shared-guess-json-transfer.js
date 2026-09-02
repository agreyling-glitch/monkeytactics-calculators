(() => {
  "use strict";

  function init() {
    const menu=document.querySelector(".shared-guess-menu"),panel=menu?.querySelector(".shared-guess-menu-panel"),history=document.querySelector("#guess-history");
    if(!menu||!panel||!history)return false;
    if(menu.dataset.jsonTransferReady==="true")return true;

    const buttons=[...panel.querySelectorAll("button")],saveButton=buttons.find(button=>button.textContent==="Save shared guesses"),restoreButton=buttons.find(button=>button.textContent==="Restore shared guesses"),clearButton=buttons.find(button=>button.id==="clear-guesses"),status=panel.querySelector(".shared-guess-menu-status");
    if(!saveButton||!restoreButton||!clearButton||!status)return false;
    menu.dataset.jsonTransferReady="true";

    const game=document.body.classList.contains("sedecordle-page")?"Sedecordle":document.body.classList.contains("octordle-page")?"Octordle":"Quordle";
    const storageKey=`monkeytactics.${game.toLowerCase()}.shared-guesses.v1`;
    const exportButton=document.createElement("button"),importButton=document.createElement("button"),fileInput=document.createElement("input");
    exportButton.type=importButton.type="button";
    exportButton.textContent="Export shared guesses (JSON)";
    importButton.textContent="Import shared guesses (JSON)";
    fileInput.type="file";
    fileInput.accept="application/json,.json";
    fileInput.hidden=true;
    panel.insertBefore(exportButton,clearButton);
    panel.insertBefore(importButton,clearButton);
    menu.append(fileInput);

    const updateExportState=()=>exportButton.disabled=!history.children.length;
    new MutationObserver(updateExportState).observe(history,{childList:true});
    updateExportState();

    exportButton.addEventListener("click",()=>{
      if(!history.children.length)return;
      saveButton.click();
      const snapshot=JSON.parse(localStorage.getItem(storageKey)||"null");
      if(!snapshot){status.textContent="Shared guesses could not be exported.";return}
      const payload={version:1,type:"MonkeyTactics shared guesses",game,exportedAt:new Date().toISOString(),snapshot};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;
      link.download=`${game.toLowerCase()}-shared-guesses.json`;
      link.click();
      URL.revokeObjectURL(url);
    });

    importButton.addEventListener("click",()=>fileInput.click());
    fileInput.addEventListener("change",async()=>{
      const file=fileInput.files?.[0];
      fileInput.value="";
      if(!file)return;
      try{
        const payload=JSON.parse(await file.text()),snapshot=payload?.snapshot;
        if(payload?.version!==1||payload?.type!=="MonkeyTactics shared guesses"||payload?.game!==game||!snapshot||![4,5,6].includes(snapshot.wordLength)||!Array.isArray(snapshot.guesses))throw new Error("invalid");
        localStorage.setItem(storageKey,JSON.stringify(snapshot));
        restoreButton.disabled=false;
        restoreButton.click();
      }catch{
        status.textContent=`Choose a valid ${game} shared-guesses JSON file.`;
        menu.open=true;
      }
    });
    return true;
  }

  const start=()=>{
    if(init())return;
    const observer=new MutationObserver(()=>{
      if(init())observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    requestAnimationFrame(()=>{
      if(init())observer.disconnect();
    });
  };
  if(document.readyState==="loading")window.addEventListener("DOMContentLoaded",start);
  else start();
})();
