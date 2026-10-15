const iconMarkup=name=>'<svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-'+name+'"></use></svg>';

// Keep offscreen and clipped carousel images off the network until needed.
const loadDeferredImage=image=>{
  if(!image.dataset.src||image.closest('[hidden]'))return;
  const {src,srcset,sizes}=image.dataset;
  image.loading='eager';
  if(sizes)image.sizes=sizes;
  if(srcset)image.srcset=srcset;
  image.src=src;
  delete image.dataset.src;
  delete image.dataset.srcset;
  delete image.dataset.sizes;
};
const deferredImages=[...document.querySelectorAll('img[data-src]')];
if('IntersectionObserver' in window){
  const imageObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){loadDeferredImage(entry.target);imageObserver.unobserve(entry.target);}
    });
  },{rootMargin:'320px 0px'});
  deferredImages.filter(image=>!image.closest('[data-slider-track]')).forEach(image=>imageObserver.observe(image));
  const nearTrackObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      const track=entry.target;
      const carouselImageObserver=new IntersectionObserver(images=>{
        images.forEach(image=>{
          if(image.isIntersecting){loadDeferredImage(image.target);carouselImageObserver.unobserve(image.target);}
        });
      },{root:track,rootMargin:'0px 180px'});
      track.querySelectorAll('img[data-src]').forEach(image=>carouselImageObserver.observe(image));
      nearTrackObserver.unobserve(track);
    });
  },{rootMargin:'200px 0px'});
  document.querySelectorAll('[data-slider-track]').forEach(track=>nearTrackObserver.observe(track));
}else{
  deferredImages.forEach(loadDeferredImage);
}
document.querySelectorAll('[data-slider-section]').forEach(section=>{
  const track=section.querySelector('[data-slider-track]');
  const previous=section.querySelector('[data-slider-prev]');
  const next=section.querySelector('[data-slider-next]');
  const progress=section.querySelector('.slider-progress>span');
  const status=section.querySelector('[data-slider-status]');
  const cards=[...track.children];
  let frame=0;
  const maxScroll=()=>Math.max(0,track.scrollWidth-track.clientWidth);
  const positions=()=>cards.map(card=>Math.min(maxScroll(),card.offsetLeft-cards[0].offsetLeft));
  const update=()=>{
    const max=maxScroll();
    previous.disabled=track.scrollLeft<=2;
    next.disabled=track.scrollLeft>=max-2;
    progress.style.transform='scaleX('+(max>0?(track.clientWidth+track.scrollLeft)/track.scrollWidth:1)+')';
    const text=max<=2?'Усі картки показано':track.scrollLeft<=2?'Початок списку':track.scrollLeft>=max-2?'Кінець списку':'Гортання карток';
    if(status.textContent!==text)status.textContent=text;
  };
  const move=direction=>{
    const offsets=positions();
    const target=direction>0?offsets.find(value=>value>track.scrollLeft+3):offsets.findLast(value=>value<track.scrollLeft-3);
    track.scrollTo({left:target??(direction>0?maxScroll():0),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  };
  previous.addEventListener('click',()=>move(-1));
  next.addEventListener('click',()=>move(1));
  track.addEventListener('scroll',()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;update();});},{passive:true});
  track.addEventListener('keydown',event=>{
    if(event.target!==track)return;
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}
  });
  if('ResizeObserver' in window)new ResizeObserver(update).observe(track);
  track.querySelectorAll('img').forEach(img=>img.addEventListener('load',update,{once:true}));
  update();
});
const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.header nav');
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Закрити меню':'Відкрити меню');nav.classList.toggle('open',open);toggle.innerHTML=iconMarkup(open?'x':'menu');});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Відкрити меню');toggle.innerHTML=iconMarkup('menu');}));
document.querySelectorAll('[data-book]').forEach(button=>button.addEventListener('click',()=>{document.querySelector('#goal').value=button.dataset.book;document.querySelector('#booking').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});setTimeout(()=>document.querySelector('#name').focus({preventScroll:true}),450);}));
// Reveal once, when each item is visible (including horizontally clipped slides).
// Only opacity and translation animate; no layout work or scroll listeners.
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
if('IntersectionObserver' in window&&Element.prototype.animate&&!motionPreference.matches){
  const groups=[
    ['.header',0],
    ['.hero-content > *',95],
    ['.hero-media',120],
    ['.section-heading',0],
    ['[data-slider-track] > *',85],
    ['.slider-controls',0],
    ['.faq-intro',0],
    ['.questions > details',65],
    ['.booking > *',90],
    ['.contacts > *',90],
    ['.footer',0]
  ];
  const pending=new Set();
  const delays=new WeakMap();
  const active=new Map();
  const reveal=(element,immediate=false)=>{
    if(!pending.delete(element))return;
    observer.unobserve(element);
    element.classList.remove('motion-pending');
    if(immediate||motionPreference.matches)return;
    const animation=element.animate([
      {opacity:0,translate:'0 24px'},
      {opacity:1,translate:'0 0'}
    ],{duration:800,delay:delays.get(element)||0,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
    active.set(element,animation);
    animation.onfinish=()=>active.delete(element);
  };
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting)reveal(entry.target);});
  },{threshold:0,rootMargin:'0px 0px -24px 0px'});
  groups.forEach(([selector,step])=>{
    [...document.querySelectorAll(selector)].forEach((element,index)=>{
      if(element.closest('[hidden]'))return;
      // Restart the stagger for each carousel instead of accumulating delays.
      const siblings=element.parentElement.querySelectorAll(':scope > '+(element.matches('details')?'details':'*'));
      const order=selector==='[data-slider-track] > *'?[...siblings].indexOf(element):index;
      delays.set(element,Math.min(order*step,240));
      pending.add(element);
      element.classList.add('motion-pending');
      observer.observe(element);
    });
  });
  // Keyboard navigation never lands on an invisible control.
  document.addEventListener('focusin',event=>{
    const item=event.target.closest('.motion-pending');
    if(item)reveal(item,true);
    for(const [element,animation] of active){
      if(element.contains(event.target)){animation.cancel();active.delete(element);}
    }
  });
  motionPreference.addEventListener('change',event=>{
    if(!event.matches)return;
    [...pending].forEach(element=>reveal(element,true));
    active.forEach(animation=>animation.cancel());
    active.clear();
    observer.disconnect();
  });
}

document.querySelector('#year').textContent=new Date().getFullYear();
document.querySelector('#booking-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const fields=new FormData(form);const text=`Вітаю, FIRE body! Хочу записатися. Ім’я: ${fields.get('name').trim()}. Телефон: ${fields.get('phone').trim()}. Цікавить: ${fields.get('goal')}.${fields.get('wish').trim()?` Зручний час: ${fields.get('wish').trim()}.`:''} Будь ласка, уточніть вартість та підтвердьте час.`;const result=document.querySelector('#form-result');result.replaceChildren();const info=document.createElement('p');info.textContent='Заявку підготовлено. Надішли SMS студії та дочекайся відповіді. Якщо SMS не відкривається, скопіюй текст або зателефонуй.';const message=document.createElement('textarea');message.readOnly=true;message.setAttribute('aria-label','Текст заявки для надсилання');message.value=text;const link=document.createElement('a');link.href=`sms:+380966062590${/iPhone|iPad|iPod/.test(navigator.userAgent)?'&':'?'}body=${encodeURIComponent(text)}`;link.textContent='Відкрити SMS і надіслати ';link.insertAdjacentHTML('beforeend',iconMarkup('send'));const call=document.createElement('a');call.href='tel:+380966062590';call.textContent='Зателефонувати у студію';result.append(info,message,link,call);result.hidden=false;result.scrollIntoView({block:'nearest',behavior:'smooth'});});
