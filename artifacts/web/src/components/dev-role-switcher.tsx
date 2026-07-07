import { useState, useEffect } from 'react';

export function DevRoleSwitcher() {
  const [role, setRole] = useState(localStorage.getItem('mockRole') || '');

  const handleRoleChange = (newRole: string) => {
    if (newRole) {
      localStorage.setItem('mockRole', newRole);
    } else {
      localStorage.removeItem('mockRole');
    }
    setRole(newRole);
    window.location.href = '/dashboard';
  };

  // Only render in dev/preview
  if (import.meta.env.PROD && !window.location.hostname.includes('replit.dev')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <select
        value={role}
        onChange={(e) => handleRoleChange(e.target.value)}
        className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full shadow-lg border border-primary/20 cursor-pointer outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Live Auth</option>
        <option value="admin">Mock: Admin</option>
        <option value="scheduler">Mock: Scheduler</option>
        <option value="ci">Mock: CI</option>
        <option value="student">Mock: Student</option>
      </select>
    </div>
  );
}
