import { GpsStatus, LocomotionMode, RouteData, NavigationSession, HistorySession } from './types';

const API_BASE = '/api';
const LOCAL_STORAGE_KEY = 'trackguard_sessions_history';

export async function fetchStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/status`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Status error: ${res.statusText}`);
  return res.json();
}

export async function fetchGps(): Promise<GpsStatus> {
  const res = await fetch(`${API_BASE}/gps`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GPS error: ${res.statusText}`);
  const data = await res.json();
  return data.status || data;
}

export async function setRobotMode(mode: LocomotionMode): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    return res.ok;
  } catch (err) {
    console.warn('Mode set failed:', err);
    return false;
  }
}

export async function calculateRoute(
  startLat: number,
  startLon: number,
  destLat: number,
  destLon: number
): Promise<{ success: boolean; route?: RouteData; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_lat: startLat,
        start_lon: startLon,
        dest_lat: destLat,
        dest_lon: destLon
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'No traversable path found between points. Please choose another destination.'
      };
    }
    const source = data.route?.source || '';
    if (source.includes('Geodesic') || source.includes('Fallback')) {
      return {
        success: false,
        error: 'No traversable road network route exists between these coordinates. Direct straight lines are not permitted.'
      };
    }
    return { success: true, route: data.route };
  } catch (err: any) {
    return { success: false, error: err.message || 'Route network communication failure.' };
  }
}

export async function startNavigationSession(
  mode: LocomotionMode,
  startLat: number,
  startLon: number,
  destLat: number,
  destLon: number,
  startSource: 'gnss' | 'manual' = 'manual',
  routeData?: RouteData | null
): Promise<{ success: boolean; session_id?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/navigation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        start_lat: startLat,
        start_lon: startLon,
        dest_lat: destLat,
        dest_lon: destLon,
        start_source: startSource,
        route_data: routeData
      })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stopNavigationSession(
  sessionId?: string | null
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/navigation/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        status: 'cancelled'
      })
    });
    return res.json();
  } catch (err) {
    console.warn('Stop navigation failed:', err);
    return { success: true };
  }
}

export async function completeNavigationSession(
  sessionId: string | null
): Promise<{ success: boolean; completion?: string }> {
  try {
    const res = await fetch(`${API_BASE}/navigation/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        completion_method: 'manual',
        status: 'completed'
      })
    });
    if (res.ok) {
      return res.json();
    }
    // Fallback directly to stop if complete endpoint returns error
    await fetch(`${API_BASE}/navigation/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, completion_method: 'manual', status: 'completed' })
    });
    return { success: true, completion: 'manual' };
  } catch (err) {
    console.warn('Complete session error:', err);
    return { success: true, completion: 'manual' };
  }
}

export async function fetchNavigationSession(): Promise<{ success: boolean; session?: NavigationSession }> {
  try {
    const res = await fetch(`${API_BASE}/navigation/session`);
    if (res.ok) {
      return res.json();
    }
  } catch {}
  return { success: false };
}

export async function fetchHistory(): Promise<HistorySession[]> {
  try {
    const res = await fetch(`${API_BASE}/history`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data.sessions || [];
    }
  } catch {}
  return [];
}

export async function checkLocalTiles(): Promise<boolean> {
  try {
    const res = await fetch('/tiles/0/0/0.png', { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

// Local Storage Persistence (Requirement 6 & 9)
export function saveLocalSession(session: NavigationSession): void {
  try {
    const existing = getLocalSessions();
    const filtered = existing.filter(s => s.session_id !== session.session_id);
    filtered.unshift(session);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch (e) {
    console.warn('Local storage save error:', e);
  }
}

export function getLocalSessions(): NavigationSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
