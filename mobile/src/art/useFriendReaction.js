import { createContext, useContext } from 'react';
export const MotionContext = createContext({ reaction: null, bodyTransform: '', eyeTransform: '', props: {} });
export default function useFriendReaction() { return useContext(MotionContext); }
