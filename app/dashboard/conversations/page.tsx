export default function ConversationsEmptyPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center border border-slate-900 bg-slate-900/10 rounded-lg text-slate-500 p-6 font-sans">
      <span className="text-4xl mb-2">📥</span>
      <h3 className="font-semibold text-slate-350 text-sm">No Thread Selected</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">
        Select a conversation from the left inbox panel to view message logs, track AI replies, or manually respond to the user.
      </p>
    </div>
  );
}
