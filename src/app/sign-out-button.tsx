"use client";

export function SignOutButton() {
  async function handleSignOut() {
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/" });
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
    >
      Sign out
    </button>
  );
}
