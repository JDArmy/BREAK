import{B as m,a as y}from"./index.418297f9.js";/* empty css                        */import{n as K,o as E,g as A,l as B}from"./element-plus.7c0d76a0.js";import{d as g,l as n,m as d,W as t,P as f,ad as b,u as c,k as s,U as o,S as r,a5 as i,O as k}from"./vue.b4a71da1.js";import"./vue-router.f4f73926.js";import"./vue-i18n.cf8f6641.js";const R={class:"avoidance-category-title"},V={class:"avoidance-category-description"},C={class:"reference-list"},N=["href"],O=g({__name:"AvoidancesView",setup(j){let w=Object.keys(m.avoidanceCategories),u=Object();return w.forEach(e=>{u[e]=Array(),Object.keys(m.avoidances).forEach(p=>{let l=m.avoidances[p];if(e!==l.category)return;let v={...l,aKey:p};u[e].push(v)})}),(e,p)=>{const l=K,v=E;return s(),n(f,null,[d("h3",null,t(e.$t("menu.avoidances")),1),(s(!0),n(f,null,b(c(u),(T,_)=>(s(),n("div",null,[d("div",null,[d("h4",R,t(e.$t(`BREAK.avoidanceCategories.${_}.title`))+" ("+t(c(m).avoidanceCategories[_].keyword)+") ",1),d("div",V,t(e.$t(`BREAK.avoidanceCategories.${_}.description`)),1)]),o(v,{data:c(u)[_],stripe:"",border:""},{default:r(()=>[o(l,{prop:"aKey",width:"100px",label:e.$t("ID")},null,8,["label"]),o(l,{width:"150px",label:e.$t("title")},{header:r(()=>[i(t(e.$t("title")),1)]),default:r(a=>[i(t(a.row.aKey?e.$t(`BREAK.avoidances.${a.row.aKey}.title`):""),1)]),_:1},8,["label"]),o(l,{label:e.$t("summary")},{default:r(a=>[i(t(a.row.aKey?e.$t(`BREAK.avoidances.${a.row.aKey}.summary`):""),1)]),_:1},8,["label"]),o(l,{label:e.$t("description")},{default:r(a=>[i(t(a.row.aKey?e.$t(`BREAK.avoidances.${a.row.aKey}.description`):""),1)]),_:1},8,["label"]),o(l,{width:"250px",label:e.$t("references")},{default:r(a=>[d("ul",C,[(s(!0),n(f,null,b(a.row.references,(h,$)=>(s(),n("li",null,[a.row.aKey?(s(),n("a",{key:0,href:h.link,target:"_blank"},[o(c(A),null,{default:r(()=>[o(c(B))]),_:1}),i(t(e.$t(`BREAK.avoidances.${a.row.aKey}.references[${$}].title`)),1)],8,N)):k("",!0),i(": "+t(e.$t(`BREAK.avoidances.${a.row.aKey}.references[${$}].description`)),1)]))),256))])]),_:1},8,["label"])]),_:2},1032,["data"])]))),256))],64)}}});const U=y(O,[["__scopeId","data-v-1a04225c"]]);export{U as default};