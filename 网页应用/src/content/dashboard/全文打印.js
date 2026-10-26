export async function preparePdfPrint(pdf,onProgress=()=>{},signal){
 const frame=document.createElement('iframe');frame.title='论文全文打印';frame.className='pdf-print-frame';document.body.append(frame);
 const doc=frame.contentDocument,urls=[];
 const dispose=()=>{urls.forEach(url=>URL.revokeObjectURL(url));frame.remove();};
 try{
  doc.open();doc.write('<!doctype html><html><head><meta charset="utf-8"><title>论文全文打印</title></head><body></body></html>');doc.close();
  const style=doc.createElement('style');style.textContent='html,body{margin:0;padding:0;background:white}section{break-after:page;break-inside:avoid;overflow:hidden}section:last-child{break-after:auto}img{display:block;width:100%;height:100%}';doc.head.append(style);
  for(let i=1;i<=pdf.numPages;i++){
   if(signal?.aborted)throw new Error('已取消准备打印');
   const page=await pdf.getPage(i),normal=page.getViewport({scale:1}),viewport=page.getViewport({scale:2});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   const task=page.render({canvasContext:canvas.getContext('2d'),viewport,intent:'print'});
   const abort=()=>task.cancel();signal?.addEventListener('abort',abort,{once:true});try{await task.promise;}finally{signal?.removeEventListener('abort',abort);}
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));canvas.width=canvas.height=0;if(!blob)throw new Error('无法准备打印页面');
   const url=URL.createObjectURL(blob);urls.push(url);
   const section=doc.createElement('section'),img=doc.createElement('img');img.alt='原文第'+i+'页';img.src=url;section.style.cssText=`width:${normal.width}pt;height:${normal.height}pt;page:sheet${i}`;
   style.textContent+=`@page sheet${i}{size:${normal.width}pt ${normal.height}pt;margin:0}`;
   section.append(img);doc.body.append(section);await img.decode();onProgress(i,pdf.numPages);
  }
  if(signal?.aborted)throw new Error('已取消准备打印');
  return {frame,dispose};
 }catch(e){dispose();throw e;}
}
