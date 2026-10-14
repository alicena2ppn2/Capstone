import { PROTOTYPE_FRIENDS } from './prototypeFriends.js';
import { BASIC_FRIEND_DRAFTS } from './characterExpansion.js';
export const IDENTITY_FRIENDS = [...PROTOTYPE_FRIENDS, ...BASIC_FRIEND_DRAFTS];
export const IDENTITY_PLANS = [{id:'A',name:'현재 원본'},{id:'B',name:'눈·얼굴 표정'},{id:'C',name:'B + 체형·기본 자세'}];
export const IDENTITY_NOTES = {
  'proto-pebble': { B:'둥글고 편안한 눈, 큰 원형 빛과 작은 타원 빛, 넉넉한 미소', C:'몸통을 조금 통통하게, 배 앞에 편하게 둔 두 손' },
  'proto-pear': { B:'또렷한 세로 눈과 길쭉한 빛, 살짝 열린 작은 웃음', C:'처진 귀·머리 장식을 유지하고 한쪽 앞발을 들어 인사' },
  'proto-quilt': { B:'조금 가로로 긴 눈과 부드럽게 올라간 눈꼬리, 짧은 곡선 빛', C:'앞발을 모으고 발 간격을 좁히며 꼬리를 몸 가까이 말기' },
  'draft-deer': { B:'맑은 세로 눈과 살짝 처진 눈매, 좁고 긴 빛과 작은 점', C:'앞발을 모으고 몸·다리를 조금 길게 세운 자세' },
  'draft-hedgehog': { B:'작고 둥근 눈, 넓은 눈 간격, 작은 둥근 빛과 엉뚱한 입', C:'짧고 통통한 몸, 작은 발과 짧게 모은 앞발' },
  'draft-duck': { B:'가로로 둥근 눈과 올라간 눈꼬리, 가로 빛과 작은 반짝임', C:'넓적한 몸과 더 벌어진 물갈퀴, 한쪽 날개 든 자세 유지' },
};
