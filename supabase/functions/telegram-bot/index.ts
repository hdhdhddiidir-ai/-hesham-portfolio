const U="https://cdyrtfixvghjjptkuzxg.supabase.co",A=7456305589,B="portfolio-works";
const T=Deno.env.get("TELEGRAM_BOT_TOKEN")??"",S=Deno.env.get("TELEGRAM_WEBHOOK_SECRET")??"",K=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const H={apikey:K,Authorization:"Bearer "+K,"Content-Type":"application/json"};

const tg=async(m:string,b:any)=>{
 const r=await fetch("https://api.telegram.org/bot"+T+"/"+m,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify(b)
 });
 return r.json()
};

const db=(p:string,o:any={})=>fetch(U+"/rest/v1/"+p,{
 ...o,
 headers:{...H,...(o.headers||{})}
});

const menu=(c:number,t="🎛️ لوحة تحكم Hesham Portfolio")=>
 tg("sendMessage",{
  chat_id:c,
  text:t,
  reply_markup:{
   keyboard:[
    [{text:"➕ إضافة عمل"},{text:"📋 عرض الأعمال"}],
    [{text:"✏️ تعديل عمل"},{text:"🗑️ حذف عمل"}],
    [{text:"🕒 تعليقات قيد المراجعة"}],
    [{text:"✅ تعليقات الموقع"}],
    [{text:"📊 الإحصائيات"}]
   ],
   resize_keyboard:true
  }
 });

async function sess(c:number){
 const r=await db("bot_sessions?chat_id=eq."+c+"&select=state,payload&limit=1");
 const a=await r.json();
 return a[0]??{state:"idle",payload:{}}
}

const set=async(c:number,s:string,p:any={})=>
 db("bot_sessions",{
  method:"POST",
  headers:{...H,Prefer:"resolution=merge-duplicates,return=minimal"},
  body:JSON.stringify({
   chat_id:c,
   state:s,
   payload:p,
   updated_at:new Date().toISOString()
  })
 });

const clear=(c:number)=>
 db("bot_sessions?chat_id=eq."+c,{method:"DELETE"});

async function upload(fid:string){
 const f=await tg("getFile",{file_id:fid});
 const p=f.result.file_path;
 const rr=await fetch("https://api.telegram.org/file/bot"+T+"/"+p);
 const x=new Uint8Array(await rr.arrayBuffer());
 const n=crypto.randomUUID()+(p.endsWith(".png")?".png":".jpg");

 const q=await fetch(U+"/storage/v1/object/"+B+"/"+n,{
  method:"POST",
  headers:{
   Authorization:"Bearer "+K,
   apikey:K,
   "Content-Type":p.endsWith(".png")?"image/png":"image/jpeg"
  },
  body:x
 });

 if(!q.ok)throw Error(await q.text());

 return U+"/storage/v1/object/public/"+B+"/"+n
}

const cats=[
 "🎨 Logo & Visual Identity",
 "💳 Business Card",
 "📢 Advertisement",
 "🍽️ Restaurant Menu",
 "💌 Invitations",
 "📱 Social Media Ads",
 "🖼️ Graphic Design",
 "🖨️ Print Design",
 "📄 Flyer",
 "📚 Brochure",
 "🏷️ Stickers & Labels",
 "🪧 Posters & Banners",
 "📦 Packaging Design",
 "🏢 Business & Company Designs",
 "📱 Social Media Posts & Stories",
 "✨ Digital Designs"
];

const catKeyboard={
 keyboard:[
  [cats[0],cats[1]],
  [cats[2],cats[3]],
  [cats[4],cats[5]],
  [cats[6],cats[7]],
  [cats[8],cats[9]],
  [cats[10],cats[11]],
  [cats[12],cats[13]],
  [cats[14],cats[15]]
 ].map(r=>r.map(text=>({text}))),
 resize_keyboard:true,
 one_time_keyboard:true
};

Deno.serve(async(req)=>{
 if(req.method==="GET"){
  const r=await tg("setWebhook",{
   url:U+"/functions/v1/telegram-bot",
   drop_pending_updates:false
  });
  return new Response(JSON.stringify({ok:true,webhook:r}),{
   headers:{"Content-Type":"application/json"}
  })
 }

 if(req.method!=="POST")
  return new Response("Method Not Allowed",{status:405});

 let u:any;
 try{
  u=await req.json()
 }catch(_){
  return new Response("OK")
 }

 const m=u.message;
 const cb=u.callback_query;
 const c=Number(m?.chat?.id??cb?.message?.chat?.id??0);

 if(c!==A)return new Response("OK");

 try{
  if(cb){
   await tg("answerCallbackQuery",{callback_query_id:cb.id});
   const d=String(cb.data||"");

   if(d.startsWith("edit:")){
    const id=Number(d.slice(5));
    const r=await db("works?id=eq."+id+"&select=id,title,is_visible");
    const a=await r.json();

    if(!a[0]){
     await menu(c,"❌ العمل غير موجود.");
     return new Response("OK")
    }

    await tg("sendMessage",{
     chat_id:c,
     text:"✏️ #"+id+" — "+a[0].title+"\n\nاختار التعديل:",
     reply_markup:{
      inline_keyboard:[
       [{text:"📝 تعديل الاسم",callback_data:"ef:title:"+id}],
       [
        {text:"🖼️ تغيير الصورة",callback_data:"ef:image:"+id},
        {text:"🗑️ إزالة الصورة",callback_data:"ef:remove:"+id}
       ],
       [{text:"🏷️ تعديل التصنيف",callback_data:"ef:category:"+id}],
       [{text:"📄 تعديل الوصف",callback_data:"ef:description:"+id}],
       [{
        text:a[0].is_visible?"🔴 إخفاء":"🟢 إظهار",
        callback_data:"ef:visibility:"+id
       }]
      ]
     }
    });

    return new Response("OK")
   }

   if(d.startsWith("ef:")){
    const z=d.split(":");
    const f=z[1];
    const id=Number(z[2]);

    if(f==="remove"||f==="visibility"){
     const r=await db("works?id=eq."+id+"&select=is_visible");
     const a=await r.json();
     if(!a[0])return new Response("OK");

     const body=f==="remove"
      ?{image_url:""}
      :{is_visible:!a[0].is_visible};

     const q=await db("works?id=eq."+id,{
      method:"PATCH",
      headers:{...H,Prefer:"return=minimal"},
      body:JSON.stringify(body)
     });

     if(!q.ok)throw Error(await q.text());

     await menu(c,"✅ تم تنفيذ التعديل على العمل #"+id+".");
     return new Response("OK")
    }

    await set(c,"edit_"+f,{id});

    await tg("sendMessage",{
     chat_id:c,
     text:f==="image"?"📸 ابعت الصورة الجديدة.":
      f==="title"?"📝 ابعت الاسم الجديد.":
      f==="category"?"🏷️ اختار التصنيف الجديد.":
      "📄 ابعت الوصف الجديد، أو اكتب لا لمسحه.",
     reply_markup:f==="category"?catKeyboard:undefined
    });

    return new Response("OK")
   }

   if(d.startsWith("del:")){
    const id=Number(d.slice(4));
    const r=await db("works?id=eq."+id,{method:"DELETE"});
    if(!r.ok)throw Error(await r.text());
    await menu(c,"🗑️ تم حذف العمل #"+id+" بنجاح.")
   }
   else if(d.startsWith("reviewapprove:")){
    const id=Number(d.slice(14));
    const r=await db("customer_reviews?id=eq."+id,{
     method:"PATCH",
     headers:{...H,Prefer:"return=minimal"},
     body:JSON.stringify({status:"approved"})
    });
    if(!r.ok)throw Error(await r.text());
    await menu(c,"✅ تمت الموافقة على التعليق #"+id+"، وسيظهر للزوار.")
   }
   else if(d.startsWith("reviewreject:")){
    const id=Number(d.slice(13));
    const r=await db("customer_reviews?id=eq."+id,{
     method:"PATCH",
     headers:{...H,Prefer:"return=minimal"},
     body:JSON.stringify({status:"rejected"})
    });
    if(!r.ok)throw Error(await r.text());
    await menu(c,"🚫 تم رفض التعليق #"+id+".")
   }
   else if(d.startsWith("reviewpending:")){
    const id=Number(d.slice(14));
    const r=await db("customer_reviews?id=eq."+id,{
     method:"PATCH",
     headers:{...H,Prefer:"return=minimal"},
     body:JSON.stringify({status:"pending"})
    });
    if(!r.ok)throw Error(await r.text());
    await menu(c,"🔄 تم إرجاع التعليق #"+id+" إلى قائمة المراجعة، وأصبح غير معتمد.")
   }
   else if(d.startsWith("reviewdel:")){
    const id=Number(d.slice(10));
    const r=await db("customer_reviews?id=eq."+id,{method:"DELETE"});
    if(!r.ok)throw Error(await r.text());
    await menu(c,"🗑️ تم حذف التعليق #"+id+" بنجاح.")
   }

   return new Response("OK")
  }

  const t=String(m?.text||"").trim();

  if(t==="/start"||t==="/menu"){
   await clear(c);
   await menu(c);
   return new Response("OK")
  }

  if(t==="📊 الإحصائيات"){
   const wr=await db("works?select=id,title,category,is_visible,created_at&order=created_at.desc");
   const rr=await db("customer_reviews?select=id,name,review,rating,status,created_at&order=created_at.desc");
   const wa=await wr.json();
   const ra=await rr.json();

   const works=Array.isArray(wa)?wa:[];
   const reviews=Array.isArray(ra)?ra:[];
   const visible=works.filter((x:any)=>x.is_visible).length;

   const counts:any={};
   for(const x of works){
    const k=x.category||"بدون تصنيف";
    counts[k]=(counts[k]||0)+1
   }

   const catsText=Object.entries(counts)
    .sort((a:any,b:any)=>b[1]-a[1])
    .map(([k,v])=>"• "+k+": "+v)
    .join("\n")||"• مفيش أعمال";

   const latestWork=works[0];
   const latestReview=reviews[0];
   const pending=reviews.filter((x:any)=>x.status==="pending").length;
   const approved=reviews.filter((x:any)=>x.status==="approved").length;

   const ratings=reviews.filter((x:any)=>
    x.status==="approved"&&Number(x.rating)>=1&&Number(x.rating)<=5
   );

   const avg=ratings.length
    ?(ratings.reduce((n:number,x:any)=>n+Number(x.rating),0)/ratings.length).toFixed(1)
    :"—";

   const text=
    "📊 إحصائيات Hesham Portfolio\n\n"+
    "🎨 إجمالي الأعمال: "+works.length+"\n"+
    "🟢 الأعمال الظاهرة: "+visible+"\n"+
    "💬 إجمالي التعليقات: "+reviews.length+"\n"+
    "🕒 قيد المراجعة: "+pending+"\n"+
    "✅ تعليقات معتمدة: "+approved+"\n"+
    "⭐ متوسط التقييم المعتمد: "+avg+"/5 ("+ratings.length+" تقييم)\n\n"+
    "🏷️ توزيع الأعمال حسب التصنيف:\n"+catsText+"\n\n"+
    "🆕 آخر عمل: "+(latestWork?latestWork.title:"مفيش أعمال")+"\n"+
    "💬 آخر تعليق: "+(latestReview?latestReview.name+" — "+String(latestReview.review||"").slice(0,120):"مفيش تعليقات");

   await menu(c,text);
   return new Response("OK")
  }

  if(t==="✏️ تعديل عمل"){
   const r=await db("works?select=id,title&order=id.desc");
   const a=await r.json();

   if(!a.length){
    await menu(c,"✏️ مفيش أعمال لتعديلها.");
    return new Response("OK")
   }

   await tg("sendMessage",{
    chat_id:c,
    text:"✏️ اختار العمل اللي عايز تعدله:",
    reply_markup:{
     inline_keyboard:a.map((w:any)=>[{
      text:"✏️ #"+w.id+" — "+w.title,
      callback_data:"edit:"+w.id
     }])
    }
   });

   return new Response("OK")
  }

  if(t==="➕ إضافة عمل"){
   await set(c,"image");
   await tg("sendMessage",{
    chat_id:c,
    text:"📸 ابعت صورة العمل دلوقتي."
   });
   return new Response("OK")
  }

  if(t==="📋 عرض الأعمال"){
   const r=await db("works?select=id,title,category,is_visible&order=id.desc");
   const a=await r.json();

   await menu(c,a.length
    ?"📋 أعمالك:\n\n"+a.map((w:any)=>
      "#"+w.id+" — "+w.title+"\n🏷️ "+
      (w.category||"بدون تصنيف")+" | "+
      (w.is_visible?"🟢 ظاهر":"🔴 مخفي")
     ).join("\n\n")
    :"📋 مفيش أعمال مضافة لسه."
   );

   return new Response("OK")
  }

  if(t==="🗑️ حذف عمل"){
   const r=await db("works?select=id,title&order=id.desc");
   const a=await r.json();

   if(!a.length){
    await menu(c,"🗑️ مفيش أعمال لحذفها.")
   }else{
    await tg("sendMessage",{
     chat_id:c,
     text:"🗑️ اختار العمل:",
     reply_markup:{
      inline_keyboard:a.map((w:any)=>[{
       text:"🗑️ #"+w.id+" — "+w.title,
       callback_data:"del:"+w.id
      }])
     }
    })
   }

   return new Response("OK")
  }

  // 🕒 عرض التعليقات قيد المراجعة فقط
  if(t==="🕒 تعليقات قيد المراجعة"){
   const r=await db("customer_reviews?select=id,name,review,rating,status,created_at&status=eq.pending&order=created_at.asc");
   const a=await r.json();

   if(!r.ok||!Array.isArray(a)){
    await menu(c,"⚠️ مقدرتش أجيب التعليقات. راجع إعدادات قاعدة البيانات.");
    return new Response("OK")
   }

   if(!a.length){
    await menu(c,"✅ مفيش تعليقات قيد المراجعة حاليًا.");
    return new Response("OK")
   }

   await tg("sendMessage",{
    chat_id:c,
    text:"🕒 التعليقات قيد المراجعة ("+a.length+")"
   });

   for(const x of a){
    await tg("sendMessage",{
     chat_id:c,
     text:
      "💬 تعليق #"+x.id+"\n\n"+
      "👤 الاسم: "+String(x.name??"")+"\n"+
      "⭐ التقييم: "+String(x.rating??5)+"/5\n\n"+
      "📝 التعليق:\n"+String(x.review??"")+
      "\n\n🕒 الحالة: قيد المراجعة",
     reply_markup:{
      inline_keyboard:[
       [
        {text:"✅ موافقة ونشر",callback_data:"reviewapprove:"+x.id},
        {text:"🚫 رفض",callback_data:"reviewreject:"+x.id}
       ],
       [{text:"🗑️ حذف نهائي",callback_data:"reviewdel:"+x.id}]
      ]
     }
    })
   }

   return new Response("OK")
  }

  // ✅ عرض التعليقات المنشورة على الموقع فقط
  if(t==="✅ تعليقات الموقع"){
   const r=await db("customer_reviews?select=id,name,review,rating,status,created_at&status=eq.approved&order=created_at.desc");
   const a=await r.json();

   if(!r.ok||!Array.isArray(a)){
    await menu(c,"⚠️ مقدرتش أجيب التعليقات المنشورة. راجع إعدادات قاعدة البيانات.");
    return new Response("OK")
   }

   if(!a.length){
    await menu(c,"📭 مفيش تعليقات معتمدة على الموقع حاليًا.");
    return new Response("OK")
   }

   await tg("sendMessage",{
    chat_id:c,
    text:"✅ التعليقات المنشورة على الموقع ("+a.length+")"
   });

   for(const x of a){
    await tg("sendMessage",{
     chat_id:c,
     text:
      "✅ تعليق منشور #"+x.id+"\n\n"+
      "👤 الاسم: "+String(x.name??"")+"\n"+
      "⭐ التقييم: "+String(x.rating??5)+"/5\n\n"+
      "📝 التعليق:\n"+String(x.review??"")+
      "\n\n📢 الحالة: منشور على الموقع",
     reply_markup:{
      inline_keyboard:[
       [{
        text:"🔄 إرجاع للمراجعة وإخفاء",
        callback_data:"reviewpending:"+x.id
       }],
       [{
        text:"🗑️ حذف نهائي",
        callback_data:"reviewdel:"+x.id
       }]
      ]
     }
    })
   }

   return new Response("OK")
  }

  const s=await sess(c);

  if(s.state.startsWith("edit_")){
   const f=s.state.slice(5);
   const id=Number(s.payload.id);

   if(f==="image"&&m?.photo?.length){
    const image_url=await upload(m.photo.at(-1).file_id);
    const q=await db("works?id=eq."+id,{
     method:"PATCH",
     headers:{...H,Prefer:"return=minimal"},
     body:JSON.stringify({image_url})
    });

    if(!q.ok)throw Error(await q.text());

    await clear(c);
    await menu(c,"✅ تم تغيير الصورة بنجاح.");
    return new Response("OK")
   }

   if(t){
    if(f==="category"&&!cats.includes(t))
     return new Response("OK");

    const body:any={};

    body[f==="title"?"title":f==="category"?"category":"description"]=
     (f==="description"&&t==="لا")?"":t;

    const q=await db("works?id=eq."+id,{
     method:"PATCH",
     headers:{...H,Prefer:"return=minimal"},
     body:JSON.stringify(body)
    });

    if(!q.ok)throw Error(await q.text());

    await clear(c);
    await menu(c,"✅ تم تعديل العمل #"+id+" بنجاح.");
    return new Response("OK")
   }
  }

  if(s.state==="image"&&m?.photo?.length){
   const image_url=await upload(m.photo.at(-1).file_id);
   await set(c,"title",{image_url});
   await tg("sendMessage",{
    chat_id:c,
    text:"📝 تمام! الصورة وصلت. ابعت اسم العمل."
   });
   return new Response("OK")
  }

  if(s.state==="title"&&t){
   await set(c,"category",{...s.payload,title:t});
   await tg("sendMessage",{
    chat_id:c,
    text:"🏷️ اختار تصنيف العمل من الـ16 خدمة:",
    reply_markup:catKeyboard
   });
   return new Response("OK")
  }

  if(s.state==="category"&&t&&cats.includes(t)){
   await set(c,"description",{...s.payload,category:t});
   await tg("sendMessage",{
    chat_id:c,
    text:"✍️ اكتب وصف قصير، أو اكتب لا."
   });
   return new Response("OK")
  }

  if(s.state==="description"&&t){
   const p={...s.payload,description:t==="لا"?"":t};
   await set(c,"confirm",p);
   await tg("sendMessage",{
    chat_id:c,
    text:"✅ البيانات جاهزة. اكتب حفظ أو إلغاء."
   });
   return new Response("OK")
  }

  if(s.state==="confirm"&&t==="حفظ"){
   const p=s.payload;

   const r=await db("works",{
    method:"POST",
    headers:{...H,Prefer:"return=minimal"},
    body:JSON.stringify({
     title:p.title,
     category:p.category,
     description:p.description||"",
     image_url:p.image_url,
     is_visible:true,
     is_featured:false,
     sort_order:0
    })
   });

   if(!r.ok)throw Error(await r.text());

   await clear(c);
   await menu(c,"🎉 تمت إضافة العمل بنجاح!");
   return new Response("OK")
  }

  if(t==="إلغاء"){
   await clear(c);
   await menu(c,"❌ تم الإلغاء.")
  }

 }catch(e){
  await tg("sendMessage",{
   chat_id:c,
   text:"⚠️ حصل خطأ في البوت. جرّب تاني."
  }).catch(()=>{})
 }

 return new Response("OK")
});
