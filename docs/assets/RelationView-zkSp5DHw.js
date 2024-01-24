import{b as t,_ as e}from"./index-U5h1j3Dk.js";/* empty css                    */import{B as a}from"./BREAK-BzhfOad0.js";import{a as o,u as l}from"./vue-router-Nb642-En.js";import{b as r,w as s,x as i,d as c,c as n}from"./element-plus-OKfYCf4W.js";import{d,b as u,r as k,o as h,w as p,q as v,l as f,W as b,u as y,_ as m,m as x,t as A,V as T,a7 as E,F as _,ah as g,Z as j,ak as O,al as R}from"./vue-n1z6Fgex.js";import"./relation-graph-qAjSoXIC.js";import"./vue-i18n-kmt_8FQk.js";const P=t=>(O("data-v-7b618a18"),t=t(),R(),t),w={style:{border:"#efefef solid 1px",height:"calc(100vh - 150px)",width:"100%"}},C=["onDblclick","onContextmenu","innerHTML"],I={class:"filter-pane",id:"node-filter-pane"},D=P((()=>A("h2",null,"节点筛选：",-1))),V={class:"filter-pane",id:"line-filter-pane"},L=P((()=>A("h2",null,"关系筛选：",-1))),H=P((()=>A("span",{class:"el-dropdown-link"},null,-1)));var S=(t=>(t.risk="risk",t.avoidance="avoidance",t.attackTool="attack-tool",t.threatActor="threat-actor",t.abilityProvider="ability-provider",t.all="all",t))(S||{}),N=(t=>(t.risk="orange",t.avoidance="green",t.attackTool="blue",t.threatActor="red",t.abilityProvider="purple",t))(N||{});const B=e(d({__name:"RelationView",setup(e){const d=o(),O=l(),R=u(d.params.type),P=u(d.params.key),B=u(),J=k({allowShowMiniToolBar:!0,disableZoom:!1,disableDragCanvas:!1,defaultExpandHolderPosition:"right",defaultShowLineLabel:!0});J.layout={layoutLabel:"中心布局",layoutName:"center",distance_coefficient:2,maxLayoutTimes:20,force_line_elastic:.3,force_node_repulsion:3};const M=k([]),U=k([]),z=k({rootId:P.value,nodes:M,lines:U}),Z=()=>{let t;switch(R.value){case"risk":{let e=a.risks[P.value];if(void 0===e)return void alert("未知ID");t=e.title;break}case"avoidance":{let e=a.avoidances[P.value];if(void 0===e)return void alert("未知ID");t=e.title;break}case"attack-tool":{let e=a.attackTools[P.value];if(void 0===e)return void alert("未知ID");t=e.title;break}case"threat-actor":{let e=a.threatActors[P.value];if(void 0===e)return void alert("未知ID");t=e.title;break}case"ability-provider":{let e=a.abilityProviders[P.value];if(void 0===e)return void alert("未知ID");t=e.title;break}default:return void alert("未知类型")}const e=Object.keys(S).find((t=>S[t]===R.value));M.push({id:P.value,type:S[e],text:P.value+"<br>"+t,color:N[e]})},q=t=>{a.risks[t].avoidances.forEach((e=>{const o=a.avoidances[e];M.push({id:e,type:"avoidance",text:e+"<br>"+o.title,color:"green"}),U.push({from:t,text:"规避手段",to:e})}))},F=t=>{Object.keys(a.attackTools).filter((e=>a.attackTools[e].risks.includes(t))).forEach((e=>{const o=a.attackTools[e];M.push({id:e,type:"attack-tool",text:e+"<br>"+o.title,color:"blue"}),U.push({from:t,text:"攻击工具",to:e})}))},K=t=>{Object.keys(a.threatActors).filter((e=>a.threatActors[e].makeRisks.includes(t))).forEach((e=>{const o=a.threatActors[e];M.push({id:e,type:"threat-actor",text:e+"<br>"+o.title,color:"red"}),U.push({from:e,text:"造成风险",to:t})}))},W=t=>{Object.keys(a.risks).filter((e=>a.risks[e].avoidances.includes(t))).forEach((e=>{const o=a.risks[e];M.push({id:e,type:"risk",text:e+"<br>"+o.title,color:"orange"}),U.push({from:e,text:"规避手段",to:t})}))},X=t=>{Object.keys(a.abilityProviders).filter((e=>Object.keys(a.abilityProviders[e].abilities).includes(t))).forEach((e=>{const o=a.abilityProviders[e];M.push({id:e,type:"ability-provider",text:e+"<br>"+o.title,color:"purple"}),U.push({from:t,text:"能力提供者",to:e})}))},Y=t=>{a.attackTools[t].risks.forEach((e=>{const o=a.risks[e];M.push({id:e,type:"risk",text:e+"<br>"+o.title,color:"orange"}),U.push({from:t,text:"制造风险",to:e})}))},$=t=>{a.attackTools[t].avoidances.forEach((e=>{const o=a.avoidances[e];M.push({id:e,type:"avoidance",text:e+"<br>"+o.title,color:"green"}),U.push({from:t,text:"规避手段",to:e})}))},G=t=>{Object.keys(a.threatActors).filter((e=>a.threatActors[e].buildAttackTools.includes(t))).forEach((e=>{const o=a.threatActors[e];M.push({id:e,type:"threat-actor",text:e+"<br>"+o.title,color:"red"}),U.push({from:e,text:"制作攻击工具",to:t})}));Object.keys(a.threatActors).filter((e=>a.threatActors[e].useAttackTools.includes(t))).forEach((e=>{const o=a.threatActors[e];M.push({id:e,type:"threat-actor",text:e+"<br>"+o.title,color:"red"}),U.push({from:e,text:"使用攻击工具",to:t})}))},Q=t=>{a.threatActors[t].makeRisks.forEach((e=>{const o=a.risks[e];M.push({id:e,type:"risk",text:e+"<br>"+o.title,color:"orange"}),U.push({from:t,text:"造成风险",to:e})}))},tt=t=>{a.threatActors[t].buildAttackTools.forEach((e=>{const o=a.attackTools[e];M.push({id:e,type:"attack-tool",text:e+"<br>"+o.title,color:"blue"}),U.push({from:t,text:"制作攻击工具",to:e})}));a.threatActors[t].useAttackTools.forEach((e=>{const o=a.attackTools[e];M.push({id:e,type:"attack-tool",text:e+"<br>"+o.title,color:"blue"}),U.push({from:t,text:"使用攻击工具",to:e})}))},et=()=>{var t;(()=>{const t=new Set;U.forEach((e=>{t.add(JSON.stringify(e))})),U.splice(0,U.length),t.forEach((t=>{U.push(JSON.parse(t))}))})(),null==(t=null==B?void 0:B.value)||t.setJsonData(z),kt()},at=(t,e,o)=>{var l;"risk"===e?"avoidance"==t?q(o):"attack-tool"==t?F(o):"threat-actor"==t?K(o):"all"==t&&(q(o),F(o),(t=>{const e=a.risks[t].avoidances;Object.keys(a.attackTools).filter((e=>a.attackTools[e].risks.includes(t))).forEach((t=>{e.forEach((e=>{a.attackTools[t].avoidances.includes(e)&&U.push({from:e,text:"规避手段",to:t})}))}))})(o),K(o),(t=>{const e=Object.keys(a.threatActors).filter((e=>a.threatActors[e].makeRisks.includes(t))),o=Object.keys(a.attackTools).filter((e=>a.attackTools[e].risks.includes(t)));e.forEach((t=>{o.forEach((e=>{a.threatActors[t].useAttackTools.includes(e)?U.push({from:t,text:"使用攻击工具",to:e}):a.threatActors[t].buildAttackTools.includes(e)&&U.push({from:t,text:"制作攻击工具",to:e})}))}))})(o)):"avoidance"===e?("risk"==t&&W(o),"ability-provider"==t&&X(o),"all"==t&&(W(o),X(o))):"attack-tool"===e?"risk"==t?Y(o):"avoidance"==t?$(o):"threat-actor"==t?G(o):"all"==t&&(Y(o),$(o),(t=>{const e=a.attackTools[t].risks,o=a.attackTools[t].avoidances;e.forEach((t=>{a.risks[t].avoidances.forEach((e=>{o.includes(e)&&U.push({from:t,text:"规避手段",to:e})}))}))})(o),G(o),(t=>{const e=Object.keys(a.threatActors).filter((e=>a.threatActors[e].buildAttackTools.includes(t))),o=Object.keys(a.threatActors).filter((e=>a.threatActors[e].useAttackTools.includes(t))),l=a.attackTools[t].risks;e.forEach((t=>{l.forEach((e=>{a.threatActors[t].makeRisks.includes(e)&&U.push({from:e,text:"攻击工具制造者",to:t})}))})),o.forEach((t=>{l.forEach((e=>{a.threatActors[t].makeRisks.includes(e)&&U.push({from:t,text:"造成风险",to:e})}))}))})(o)):"threat-actor"===e?"risk"==t?Q(o):"attack-tool"==t?tt(o):"all"==t&&(Q(o),tt(o),(t=>{const e=[...a.threatActors[t].buildAttackTools,...a.threatActors[t].useAttackTools],o=a.threatActors[t].makeRisks;e.forEach((t=>{o.forEach((e=>{o.includes(e)&&U.push({from:t,text:"造成风险",to:e})}))}))})(o)):"ability-provider"===e&&("avoidance"!=t&&"all"!=t||(l=o,Object.keys(a.abilityProviders[l].abilities).forEach((t=>{const e=a.avoidances[t];M.push({id:t,type:"avoidance",text:t+"<br>"+e.title,color:"green"}),U.push({from:t,text:"能力提供者",to:l})})))),et()};h((()=>{Z(),at("all",R.value,P.value)})),p((()=>[d.params.type,d.params.key]),(t=>{R.value=t[0],P.value=t[1],M.splice(0,M.length),U.splice(0,U.length),Z(),at("all",R.value,P.value)}));const ot=k({position:"absolute",zIndex:65535,top:"0px",left:"0px",display:"none"}),lt=u();let rt=k({risk:!1,avoidance:!1,attackTool:!1,threatActor:!1,abilityProvider:!1,all:!1,openAsRoot:!1});const st=u(""),it=u(""),ct=(t,e)=>{var a;switch(ot.top=e.clientY+"px",ot.left=e.clientX+"px",ot.display="block",null==(a=lt.value)||a.handleOpen(),t.type){case"risk":rt={risk:!0,avoidance:!1,attackTool:!1,threatActor:!1,abilityProvider:!0,all:!1,openAsRoot:!1};break;case"avoidance":rt={risk:!1,avoidance:!0,attackTool:!0,threatActor:!0,abilityProvider:!1,all:!1,openAsRoot:!1};break;case"attack-tool":rt={risk:!1,avoidance:!1,attackTool:!0,threatActor:!1,abilityProvider:!0,all:!1,openAsRoot:!1};break;case"threat-actor":rt={risk:!1,avoidance:!0,attackTool:!1,threatActor:!0,abilityProvider:!0,all:!1,openAsRoot:!1};break;case"ability-provider":rt={risk:!0,avoidance:!1,attackTool:!0,threatActor:!0,abilityProvider:!0,all:!0,openAsRoot:!1}}t.id==P.value&&(rt.openAsRoot=!0),st.value=t.type,it.value=t.id},nt=t=>{at(t,st.value,it.value)},dt=u(["risk","avoidance","attack-tool","threat-actor","ability-provider"]),ut=u([]),kt=()=>{ut.value.splice(0,ut.value.length),U.forEach((t=>{ut.value.includes(t.text)||ut.value.push(t.text)}))},ht=u(ut.value),pt=()=>{var t,e,a;const o=null==(t=B.value)?void 0:t.getInstance().getNodes(),l=null==(e=B.value)?void 0:e.getInstance().getLinks();null==o||o.forEach((t=>{let e=!1;dt.value.includes(t.type)||(e=!0),t.opacity=e?.1:1})),null==l||l.forEach((t=>{t.relations.forEach((t=>{ht.value.includes(t.text)?t.isHide=!1:t.isHide=!0}))})),null==(a=B.value)||a.getInstance().dataUpdated()};return(e,a)=>{const o=s,l=i,d=c,u=n,k=r;return x(),v("div",w,[f(y(t),{ref_key:"graphRef$",ref:B,options:J},{node:b((({node:t})=>[A("div",{style:{cursor:"pointer","font-size":"xx-small",display:"flex",height:"inherit","align-items":"center","justify-content":"center"},onDblclick:e=>ct(t,e),onContextmenu:e=>ct(t,e),innerHTML:t.text},null,40,C)])),"graph-plug":b((()=>[A("div",I,[D,f(l,{modelValue:dt.value,"onUpdate:modelValue":a[0]||(a[0]=t=>dt.value=t),onChange:pt},{default:b((()=>[(x(),T(o,{class:"filter-checkbox",key:"risk",label:"risk",name:"risk"},{default:b((()=>[E("风险")])),_:1},8,["label","name"])),(x(),T(o,{class:"filter-checkbox",key:"avoidance",label:"avoidance",name:"avoidance"},{default:b((()=>[E("规避手段")])),_:1},8,["label","name"])),(x(),T(o,{class:"filter-checkbox",key:"attack-tool",label:"attack-tool",name:"attack-tool"},{default:b((()=>[E("攻击工具")])),_:1},8,["label","name"])),(x(),T(o,{class:"filter-checkbox",key:"threat-actor",label:"threat-actor",name:"threat-actor"},{default:b((()=>[E("威胁行为者")])),_:1},8,["label","name"])),(x(),T(o,{class:"filter-checkbox",key:"ability-provider",label:"ability-provider",name:"ability-provider"},{default:b((()=>[E("能力提供者")])),_:1},8,["label","name"]))])),_:1},8,["modelValue"])]),A("div",V,[L,f(l,{modelValue:ht.value,"onUpdate:modelValue":a[1]||(a[1]=t=>ht.value=t),onChange:pt},{default:b((()=>[(x(!0),v(_,null,g(ut.value,(t=>(x(),T(o,{class:"filter-checkbox",key:t,label:t,name:t},{default:b((()=>[E(j(t),1)])),_:2},1032,["label","name"])))),128))])),_:1},8,["modelValue"])])])),_:1},8,["options"]),f(k,{ref_key:"dropdown1",ref:lt,handleOpen:!0,style:m(ot)},{dropdown:b((()=>[f(u,null,{default:b((()=>[f(d,{onClick:a[2]||(a[2]=t=>nt("risk")),disabled:y(rt).risk},{default:b((()=>[E("风险列表")])),_:1},8,["disabled"]),f(d,{onClick:a[3]||(a[3]=t=>nt("avoidance")),disabled:y(rt).avoidance},{default:b((()=>[E("规避手段")])),_:1},8,["disabled"]),f(d,{onClick:a[4]||(a[4]=t=>nt("attack-tool")),disabled:y(rt).attackTool},{default:b((()=>[E("攻击工具")])),_:1},8,["disabled"]),f(d,{onClick:a[5]||(a[5]=t=>nt("threat-actor")),disabled:y(rt).threatActor},{default:b((()=>[E("威胁行为者")])),_:1},8,["disabled"]),f(d,{onClick:a[6]||(a[6]=t=>nt("ability-provider")),disabled:y(rt).abilityProvider},{default:b((()=>[E("能力提供者")])),_:1},8,["disabled"]),f(d,{onClick:a[7]||(a[7]=t=>nt("all")),disabled:y(rt).all},{default:b((()=>[E("拉取全部关系")])),_:1},8,["disabled"]),f(d,{onClick:a[8]||(a[8]=t=>{O.push({name:"relation",params:{type:st.value,key:it.value}})}),disabled:y(rt).openAsRoot,divided:""},{default:b((()=>[E("作为根节点打开")])),_:1},8,["disabled"])])),_:1})])),default:b((()=>[H])),_:1},8,["style"])])}}}),[["__scopeId","data-v-7b618a18"]]);export{B as default};