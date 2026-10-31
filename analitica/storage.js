(function(g){
  'use strict';
  const D=g.PetDoctorAnalyticsData||require('./data.js');
  function createStore(indexedDB=g.indexedDB){
    let db,promise;
    function open(){
      if(!indexedDB)return Promise.reject(Error('IndexedDB no está disponible. Conserva el CSV original para volver a cargarlo.'));
      if(promise)return promise;
      promise=new Promise((resolve,reject)=>{
        const request=indexedDB.open('pet-doctor.analytics',1);
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('datasets'))request.result.createObjectStore('datasets');};
        request.onerror=()=>{promise=null;reject(Error('No se pudo abrir el almacenamiento de Analítica.'));};
        request.onblocked=()=>{promise=null;reject(Error('Cierra otras pestañas de Analítica para abrir sus datos.'));};
        request.onsuccess=()=>{db=request.result;db.onversionchange=()=>{db.close();db=null;promise=null;};resolve(db);};
      });return promise;
    }
    async function load(){
      const database=await open();
      const record=await new Promise((resolve,reject)=>{const tx=database.transaction('datasets','readonly'),r=tx.objectStore('datasets').get('active');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('No se pudo leer Analítica.'));});
      if(!record)return {revision:0,data:D.empty()};
      if(!Number.isSafeInteger(record.revision)||record.revision<1)throw Error('El almacenamiento de Analítica está dañado. Conserva el CSV original; revisa el almacenamiento antes de volver a cargarlo.');
      return {revision:record.revision,data:D.dataset(record.data.workspace,record.data.meta)};
    }
    async function commit(data,expected){
      const clean=D.dataset(data.workspace,data.meta),database=await open();
      return new Promise((resolve,reject)=>{
        let reason='No se guardaron los cambios. Reintenta; el CSV original permite recuperar la carga.';
        const tx=database.transaction('datasets','readwrite'),store=tx.objectStore('datasets'),read=store.get('active');
        read.onsuccess=()=>{
          const revision=read.result?.revision??0;
          if(revision!==expected){reason='Los datos cambiaron en otra pestaña. Conserva el CSV original y actualiza antes de revisar otra vez.';tx.abort();return;}
          try{store.put({revision:expected+1,data:clean},'active');}catch{tx.abort();}
        };
        tx.onabort=()=>reject(Error(reason));tx.onerror=()=>reject(Error(reason));tx.oncomplete=()=>resolve({revision:expected+1,data:clean});
      });
    }
    return {load,commit,close(){db?.close();db=null;promise=null;}};
  }
  g.PetDoctorAnalyticsStorage={createStore};if(typeof module!=='undefined')module.exports={createStore};
})(globalThis);
