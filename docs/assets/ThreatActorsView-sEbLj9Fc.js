import{R as l,a as e,_ as a}from"./index-U5h1j3Dk.js";/* empty css                        *//* empty css                    */import{B as t}from"./BREAK-BzhfOad0.js";import{u as s,e as r,m as o,v as i,o as u}from"./element-plus-OKfYCf4W.js";import{d as n,b as c,q as d,t as k,Z as p,l as b,W as m,u as f,F as h,m as w,ah as v,V as $,a7 as y,S as _}from"./vue-n1z6Fgex.js";import"./vue-router-Nb642-En.js";import"./relation-graph-qAjSoXIC.js";import"./vue-i18n-kmt_8FQk.js";const A={class:"reference-list"},K=["href"],j=a(n({__name:"ThreatActorsView",setup(a){const n=c(!1),j=c(""),C=c(!1),R=c("");let T=Object.keys(t.threatActors).map((l=>({taKey:l,...t.threatActors[l]}))),B=()=>window.innerHeight;return(a,t)=>{const c=i,g=u,E=s;return w(),d(h,null,[k("h3",null,p(a.$t("threatActors")),1),b(E,{height:f(B)()-200,"scrollbar-always-on":!0,data:f(T),border:"",stripe:""},{default:m((()=>[b(c,{prop:"taKey",width:"120",label:a.$t("ID")},null,8,["label"]),b(c,{prop:"title",width:"150",label:a.$t("title")},null,8,["label"]),b(c,{prop:"description",label:a.$t("description")},null,8,["label"]),b(c,{label:a.$t("buildAttackTools")},{default:m((l=>[(w(!0),d(h,null,v(l.row.buildAttackTools,(l=>(w(),$(g,{size:"small",key:l,onClick:e=>(j.value=l)&&(n.value=!0),class:"relational-link",round:""},{default:m((()=>[y(p(l+": "+a.$t(`BREAK.attackTools.${l}.title`)),1)])),_:2},1032,["onClick"])))),128))])),_:1},8,["label"]),b(c,{label:a.$t("useAttackTools")},{default:m((l=>[(w(!0),d(h,null,v(l.row.useAttackTools,(l=>(w(),$(g,{size:"small",key:l,onClick:e=>(j.value=l)&&(n.value=!0),class:"relational-link",round:""},{default:m((()=>[y(p(l+": "+a.$t(`BREAK.attackTools.${l}.title`)),1)])),_:2},1032,["onClick"])))),128))])),_:1},8,["label"]),b(c,{label:a.$t("risksMaker")},{default:m((l=>[(w(!0),d(h,null,v(l.row.makeRisks,(l=>(w(),$(g,{size:"small",key:l,onClick:e=>(R.value=l)&&(C.value=!0),class:"relational-link",round:""},{default:m((()=>[y(p(l+": "+a.$t(`BREAK.risks.${l}.title`)),1)])),_:2},1032,["onClick"])))),128))])),_:1},8,["label"]),b(c,{width:"250px",label:a.$t("references")},{default:m((l=>[k("ul",A,[(w(!0),d(h,null,v(l.row.references,((e,t)=>(w(),d("li",{key:t},[l.row.taKey?(w(),d("a",{key:0,href:e.link,target:"_blank"},[b(f(r),null,{default:m((()=>[b(f(o))])),_:1}),y(p(a.$t(`BREAK.threatActors.${l.row.taKey}.references[${t}].title`)),1)],8,K)):_("",!0)])))),128))])])),_:1},8,["label"])])),_:1},8,["height","data"]),b(l,{onDrawerClose:t[0]||(t[0]=l=>(C.value=!1)&&(R.value="")),drawer:C.value,rKey:R.value},null,8,["drawer","rKey"]),b(e,{onDrawerClose:t[1]||(t[1]=l=>n.value=!1),drawer:n.value,atKey:j.value},null,8,["drawer","atKey"])],64)}}}),[["__scopeId","data-v-598a1ccb"]]);export{j as default};