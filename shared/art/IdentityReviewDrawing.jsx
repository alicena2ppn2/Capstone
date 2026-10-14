import PrototypeFriendDrawing from './PrototypeFriendDrawing.jsx';
import ExpansionFriendDrawing from './ExpansionFriendDrawing.jsx';
import IdentityPrototypeDrawing from './IdentityPrototypeDrawing.jsx';
import IdentityExpansionDrawing from './IdentityExpansionDrawing.jsx';
// A is the real current drawing, with no motion/outfit. B/C are isolated snapshots.
export default function IdentityReviewDrawing({ variant, revision = 'A', elements }) {
  const prototype = variant.startsWith('proto-');
  const Drawing = revision === 'A' ? prototype ? PrototypeFriendDrawing : ExpansionFriendDrawing : prototype ? IdentityPrototypeDrawing : IdentityExpansionDrawing;
  return <Drawing variant={variant} revision={revision} elements={elements} />;
}
