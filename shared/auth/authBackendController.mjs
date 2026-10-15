import { BackendError } from '../api/backendClient.mjs';
const empty={supabaseUserId:null,backendUserId:null,backendNickname:null};
export function createAuthBackendController({client,backend}) {
  let state={status:'checking',message:'',...empty},identity=null,epoch=0,active=true,pending=null,attempt=null,logoutBusy=false,callbackBusy=false,timer=null;
  const listeners=new Set(),requests=new Set();
  const publish=patch=>{state={...state,...patch};if(active)listeners.forEach(listener=>listener(state));};
  const abortRequests=()=>{requests.forEach(c=>c.abort());requests.clear();};
  function clear(status='checking',message='') {
    epoch++;pending?.controller.abort();pending=null;abortRequests();identity=null;publish({...empty,status,message});
  }
  const deferRestore=()=>{if(timer!==null)return;timer=setTimeout(()=>{timer=null;if(active&&!attempt)void restore();},0);};
  function connect(nickname,{force=false,session:provided}={}) {
    if(pending)return pending.promise;
    const controller=new AbortController(),startEpoch=epoch,previous=state,registration=nickname!==undefined;
    if(registration)publish({...empty,supabaseUserId:identity,status:'registering',message:''});
    else if(!['authenticated','nickname'].includes(state.status)||force)publish({...empty,supabaseUserId:identity,status:'connecting',message:'게임 계정을 연결하고 있어요…'});
    const job={controller,promise:null};
    job.promise=Promise.resolve().then(async()=>{
      let version=startEpoch;
      try {
        const session=provided??await client.getSession({signal:controller.signal});
        if(!active||controller.signal.aborted||epoch!==version)return state;
        if(!session){clear('signed-out');return state;}
        if(!session.verified||session.source!=='supabase'||!session.user?.id||typeof session.access_token!=='string'||!session.access_token)throw new BackendError('Supabase 로그인 상태를 확인하지 못했어요. 다시 로그인해 주세요.');
        const uid=session.user.id;
        if(registration&&previous.supabaseUserId&&previous.supabaseUserId!==uid){clear('checking');identity=uid;publish({supabaseUserId:uid});deferRestore();return state;}
        if(identity!==uid){epoch++;version=epoch;abortRequests();identity=uid;publish({...empty,supabaseUserId:uid});}
        if(!registration&&!force&&previous.supabaseUserId===uid&&['authenticated','nickname'].includes(previous.status)) {publish(previous);return state;}
        const linked=await backend.link(session,nickname,{signal:controller.signal});
        if(!active||controller.signal.aborted||epoch!==version||identity!==uid)return state;
        publish({status:'authenticated',message:'',supabaseUserId:uid,backendUserId:linked.backendUserId,backendNickname:linked.nickname});
      }catch(error){
        if(!active||controller.signal.aborted||epoch!==version)return state;
        abortRequests();
        const message=error instanceof BackendError?error.message:'로그인 상태 또는 계정 연결을 확인하지 못했어요. 다시 시도해 주세요.';
        if(error instanceof BackendError&&error.newMember)publish({...empty,supabaseUserId:identity,status:'nickname',message:''});
        else publish({...empty,supabaseUserId:identity,status:registration&&![401,403].includes(error.status)?'nickname':'connection-error',message});
      }finally{if(pending===job)pending=null;}
      return state;
    });pending=job;return job.promise;
  }
  async function restore(url) {
    if(!active||attempt||logoutBusy)return state;
    try {
      if(url){callbackBusy=true;try{await client.handleCallback?.(url);}finally{callbackBusy=false;}}
      if(active)return await connect();
    }catch{if(active)clear('connection-error','로그인 복귀를 확인하지 못했어요. 다시 시도해 주세요.');}
    return state;
  }
  async function signIn(provider) {
    if(!active||attempt||pending||logoutBusy)return state;
    const providerLabel=provider==='kakao'?'카카오':'Google';
    clear('working',`${providerLabel} 로그인 연결 중이에요…`);const current=new AbortController();attempt=current;
    try {
      await client.signIn(provider,{signal:current.signal});
      const session=await client.getSession({signal:current.signal});
      if(active&&!current.signal.aborted){if(session)await connect(undefined,{force:true,session});else clear('signed-out','로그인을 완료하지 못했어요. 다시 시도해 주세요.');}
    }catch(error){if(active&&!current.signal.aborted){const detail=error?.message??'';clear('signed-out',/취소/.test(detail)?detail:`${providerLabel} 로그인을 완료하지 못했어요. 다시 시도해 주세요.`);}}
    finally{if(attempt===current)attempt=null;}
    return state;
  }
  async function signOut() {
    if(attempt||logoutBusy)return {ok:false,message:'로그인 창을 닫은 뒤 다시 시도해 주세요.'};
    logoutBusy=true;clear('checking');
    try {await client.signOut();if(active)clear('signed-out');return {ok:true};}
    catch{if(active)clear('connection-error','로그아웃을 완료하지 못했어요. 다시 시도해 주세요.');return {ok:false,message:'로그아웃을 완료하지 못했어요. 다시 시도해 주세요.'};}
    finally{logoutBusy=false;}
  }
  function authEvent(event,session) {
    if(!active)return;
    if(event==='SIGNED_OUT'){attempt?.abort();clear('signed-out');return;}
    const uid=session?.user?.id;if(!uid)return;
    const changed=identity!==null&&identity!==uid;
    if(changed)clear('checking');
    if(identity===null){identity=uid;publish({...empty,supabaseUserId:uid});}
    if(attempt||callbackBusy)return;
    if(!changed&&['authenticated','nickname','connection-error'].includes(state.status))return;
    // Never await SDK methods inside onAuthStateChange's synchronous callback.
    deferRestore();
  }
  async function requestUser(suffix,options={}) {
    const version=epoch,uid=identity,id=state.backendUserId;
    if(state.status!=='authenticated'||!uid||!id)throw new BackendError('게임 계정 연결 후 사용할 수 있어요.');
    if(typeof suffix!=='string'||!suffix.startsWith('/')||suffix.startsWith('//'))throw new BackendError('사용자 API 경로를 확인하지 못했어요.');
    const controller=new AbortController(),abort=()=>controller.abort();requests.add(controller);
    if(options.signal?.aborted)abort();else options.signal?.addEventListener('abort',abort,{once:true});
    try {
      const session=await client.getSession({signal:controller.signal});
      if(!controller.signal.aborted&&version===epoch&&(!session||session.user?.id!==uid)) {clear(session?'checking':'signed-out');if(session)deferRestore();}
      if(controller.signal.aborted||version!==epoch||session?.user?.id!==uid||!session?.verified||session.source!=='supabase')throw new BackendError('로그인 계정이 바뀌었어요. 다시 연결해 주세요.');
      const result=await backend.request(`/users/${encodeURIComponent(id)}${suffix}`,{...options,token:session.access_token,signal:controller.signal});
      if(controller.signal.aborted||version!==epoch||identity!==uid)throw new BackendError('로그인 계정이 바뀌었어요. 이전 요청 결과는 적용하지 않았어요.');
      return result;
    }catch(error){if(error instanceof BackendError&&error.status===401&&version===epoch)clear('connection-error','계정 연결을 다시 확인해야 해요. 다시 시도해 주세요.');throw error;}
    finally{requests.delete(controller);options.signal?.removeEventListener('abort',abort);}
  }
  return {
    getSnapshot:()=>state,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    start(){active=true;},stop(){active=false;clear();attempt?.abort();attempt=null;if(timer!==null)clearTimeout(timer);timer=null;},
    restore,signIn,signOut,authEvent,requestUser,
    retry:()=>!active||attempt||logoutBusy?Promise.resolve(state):connect(undefined,{force:true}),
    submitNickname:nickname=>{
      if(state.status!=='nickname'&&state.status!=='registering')return Promise.resolve(state);
      if(typeof nickname!=='string'||!nickname.trim()){publish({message:'닉네임을 입력해 주세요.'});return Promise.resolve(state);}
      return connect(nickname.trim(),{force:true});
    },
    cancel(){attempt?.abort();clear('connection-error','연결을 취소했어요. 다시 시도할 수 있어요.');},
    configured:client.configured,backendConfigured:backend.configured,
  };
}
