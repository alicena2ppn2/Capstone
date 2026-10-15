export const NEW_MEMBER_DETAIL = '처음 오셨네요. 닉네임을 정해 주세요.';
export class BackendError extends Error {
  constructor(message,{status=0,newMember=false}={}) {super(message);this.name='BackendError';this.status=status;this.newMember=newMember;}
}
function publicDetail(data,token,fallback) {
  const text=typeof data?.detail==='string'?data.detail:fallback;
  if(text.includes(token)||/Bearer\s|eyJ[A-Za-z0-9_-]+\./.test(text))return fallback;
  return text.slice(0,250);
}
export function createBackendClient({baseUrl,fetchImpl=globalThis.fetch,timeout=15000}) {
  let base;
  try {const url=new URL(baseUrl);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error();base=url.href.replace(/\/$/,'');}catch{/* No invented server address. */}
  async function request(path,{method='GET',body,token,signal}={}) {
    if(!base)throw new BackendError('백엔드 서버 주소가 설정되지 않았어요. 팀의 서버 주소 설정을 확인해 주세요.');
    if(!path.startsWith('/')||path.startsWith('//'))throw new BackendError('API 경로를 확인하지 못했어요.');
    if(typeof token!=='string'||!token)throw new BackendError('로그인 토큰을 확인하지 못했어요. 다시 로그인해 주세요.');
    const controller=new AbortController(),abort=()=>controller.abort();
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,timeout);
    try {
      const response=await fetchImpl(`${base}${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,redirect:'error'});
      const data=await response.json().catch(()=>null);
      if(!response.ok){
        const newMember=path==='/auth/supabase'&&response.status===404&&data?.detail===NEW_MEMBER_DETAIL;
        const fallback=response.status===404?'계정 연결 API를 찾지 못했어요. 서버 주소와 배포 버전을 확인해 주세요.':response.status===401?'로그인 상태가 만료되었거나 서버 인증에 실패했어요. 다시 시도하거나 로그인해 주세요.':'계정 연결을 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
        const message=path==='/auth/supabase'&&response.status===422&&data?.detail==='supabase_id가 필요해요.'?'서버의 Supabase 인증 설정이 준비되지 않았어요. 백엔드 환경 설정을 확인해 주세요.':publicDetail(data,token,fallback);
        throw new BackendError(message,{status:response.status,newMember});
      }
      return data;
    } catch(error) {
      if(error instanceof BackendError)throw error;
      throw new BackendError(signal?.aborted?'계정 연결을 취소했어요. 다시 시도할 수 있어요.':'서버에 연결하지 못했어요. 인터넷 연결과 서버 주소를 확인하고 다시 시도해 주세요.');
    } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  return {configured:!!base,request,async link(session,nickname,{signal}={}) {
    const data=await request('/auth/supabase',{method:'POST',token:session.access_token,body:nickname===undefined?{}:{nickname},signal});
    if(typeof data?.user?.id!=='string'||!data.user.id.trim()||typeof data.created!=='boolean')throw new BackendError('서버의 계정 응답 형식을 확인하지 못했어요. 다시 시도해 주세요.');
    return {backendUserId:data.user.id,nickname:typeof data.user.nickname==='string'?data.user.nickname:'',created:data.created};
  }};
}
