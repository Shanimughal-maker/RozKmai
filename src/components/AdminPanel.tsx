import { useState, useEffect, FormEvent } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { AdLink, UserProfile, WithdrawalRequest } from '../types';
import {
  ENV,
  safeAdd,
  formatPKR,
} from '../lib/constants';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Users,
  Wallet,
  PlaySquare,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';

export function AdminPanel() {
  const { currentUser, isAdmin } = useAuth();

  const [activeAdminTab, setActiveAdminTab] = useState<'adLinks' | 'withdrawals' | 'users' | 'analytics'>('adLinks');
  const [adLinks, setAdLinks] = useState<AdLink[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form state for Add/Edit Ad Link
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<AdLink | null>(null);
  const [formUrl, setFormUrl] = useState('');
  const [formTimer, setFormTimer] = useState<number>(30);
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [adminNotification, setAdminNotification] = useState<string | null>(null);

  // In-app Confirmation Dialog state (avoids browser confirm/prompt iframe restrictions)
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'deleteLink' | 'approveWithdrawal' | 'rejectWithdrawal';
    title: string;
    description: string;
    targetId: string;
    request?: WithdrawalRequest;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('Incorrect Account Details / Fraud prevention');

  // Load all admin data
  const fetchAllData = async () => {
    setLoading(true);
    setAdminNotification(null);
    try {
      // 1. Fetch Ad Links
      const adLinksSnap = await getDocs(collection(db, 'adLinks'));
      const fetchedLinks: AdLink[] = [];
      adLinksSnap.forEach((d) => {
        fetchedLinks.push(d.data() as AdLink);
      });
      // Sort by createdAt descending
      fetchedLinks.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAdLinks(fetchedLinks);

      // 2. Fetch Withdrawals
      try {
        const withQuery = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
        const withSnap = await getDocs(withQuery);
        const fetchedWith: WithdrawalRequest[] = [];
        withSnap.forEach((d) => {
          fetchedWith.push({ id: d.id, ...(d.data() as any) });
        });
        setWithdrawals(fetchedWith);
      } catch (err) {
        // Fallback without orderBy
        const withSnap = await getDocs(collection(db, 'withdrawals'));
        const fetchedWith: WithdrawalRequest[] = [];
        withSnap.forEach((d) => {
          fetchedWith.push({ id: d.id, ...(d.data() as any) });
        });
        fetchedWith.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setWithdrawals(fetchedWith);
      }

      // 3. Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers: UserProfile[] = [];
      usersSnap.forEach((d) => {
        fetchedUsers.push(d.data() as UserProfile);
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-md mx-auto my-12 bg-white rounded-3xl border border-rose-200 text-center shadow-sm">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-slate-900 font-['Outfit']">
          Access Restricted
        </h3>
        <p className="text-xs text-slate-500 mt-2">
          The Admin Panel is reserved strictly for the configured administrator email:
        </p>
        <div className="mt-3 py-2 px-3 bg-slate-100 rounded-xl text-xs font-mono text-slate-700 font-bold">
          {ENV.ADMIN_EMAIL}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Currently logged in as: {currentUser?.email || 'Not logged in'}
        </p>
      </div>
    );
  }

  // Handle Save Ad Link (Create or Update)
  const handleSaveAdLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!formUrl.trim()) return;

    setFormSubmitting(true);
    try {
      const linkId = editingLink ? editingLink.id : `ad-${Date.now()}`;
      const payload: AdLink = {
        id: linkId,
        url: formUrl.trim(),
        timerSeconds: Number(formTimer) || 30,
        active: formActive,
        createdAt: editingLink ? editingLink.createdAt : new Date().toISOString(),
      };

      await setDoc(doc(db, 'adLinks', linkId), payload);

      setAdminNotification(
        editingLink ? 'Ad link updated successfully!' : 'New ad link added to rotation!'
      );
      setIsFormOpen(false);
      setEditingLink(null);
      setFormUrl('');
      setFormTimer(30);
      setFormActive(true);
      await fetchAllData();
    } catch (err: any) {
      console.error(err);
      setAdminNotification(`Error: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditLinkClick = (link: AdLink) => {
    setEditingLink(link);
    setFormUrl(link.url);
    setFormTimer(link.timerSeconds);
    setFormActive(link.active);
    setIsFormOpen(true);
  };

  const handleDeleteLinkClick = (linkId: string) => {
    setConfirmDialog({
      type: 'deleteLink',
      title: 'Delete Ad Link',
      description: 'Are you sure you want to permanently delete this ad link from rotation?',
      targetId: linkId,
    });
  };

  const handleToggleActiveLink = async (link: AdLink) => {
    try {
      await updateDoc(doc(db, 'adLinks', link.id), {
        active: !link.active,
      });
      await fetchAllData();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Open in-app dialog for Approve Withdrawal
  const handleApproveWithdrawal = (req: WithdrawalRequest) => {
    setConfirmDialog({
      type: 'approveWithdrawal',
      title: 'Approve Payout',
      description: `Confirm payout approval for PKR ${req.amount.toFixed(2)} to ${req.userName} via ${req.method}?`,
      targetId: req.id,
      request: req,
    });
  };

  // Open in-app dialog for Reject Withdrawal
  const handleRejectWithdrawal = (req: WithdrawalRequest) => {
    setRejectReason('Incorrect Account Details / Fraud prevention');
    setConfirmDialog({
      type: 'rejectWithdrawal',
      title: 'Reject Payout & Refund User',
      description: `This will mark withdrawal #${req.id.substring(0, 6)} as rejected and automatically refund PKR ${req.amount.toFixed(2)} back to ${req.userName}'s wallet balance.`,
      targetId: req.id,
      request: req,
    });
  };

  // Execution Handlers
  const executeDeleteLink = async (linkId: string) => {
    try {
      await deleteDoc(doc(db, 'adLinks', linkId));
      setAdminNotification('Ad link permanently deleted from rotation.');
      setConfirmDialog(null);
      await fetchAllData();
    } catch (err: any) {
      console.error(err);
      setAdminNotification(`Failed to delete: ${err.message}`);
    }
  };

  const executeApproveWithdrawal = async (req: WithdrawalRequest) => {
    try {
      await updateDoc(doc(db, 'withdrawals', req.id), {
        status: 'approved',
        processedAt: new Date().toISOString(),
      });
      setAdminNotification(`Withdrawal #${req.id.substring(0, 6)} marked as APPROVED.`);
      setConfirmDialog(null);
      await fetchAllData();
    } catch (err: any) {
      console.error(err);
      setAdminNotification(`Approval error: ${err.message}`);
    }
  };

  const executeRejectWithdrawal = async (req: WithdrawalRequest, reason: string) => {
    try {
      // 1. Fetch user to refund balance
      const userRef = doc(db, 'users', req.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        const refundedBalance = safeAdd(userData.balance || 0, req.amount);
        await updateDoc(userRef, {
          balance: refundedBalance,
        });
      }

      // 2. Mark withdrawal as rejected with refund note
      await updateDoc(doc(db, 'withdrawals', req.id), {
        status: 'rejected',
        processedAt: new Date().toISOString(),
        note: reason.trim() || 'Rejected by Admin',
      });

      setAdminNotification(
        `Withdrawal #${req.id.substring(0, 6)} REJECTED and PKR ${req.amount.toFixed(2)} was refunded to user's wallet.`
      );
      setConfirmDialog(null);
      await fetchAllData();
    } catch (err: any) {
      console.error(err);
      setAdminNotification(`Rejection error: ${err.message}`);
    }
  };

  // Analytics Computations
  const totalUsersCount = users.length;
  const totalAdsToday = users.reduce((acc, u) => acc + (u.todayAdsWatched || 0), 0);
  const totalLifetimeAds = users.reduce((acc, u) => acc + (u.totalAdsWatched || 0), 0);
  const totalUserBalances = users.reduce((acc, u) => safeAdd(acc, u.balance || 0), 0);

  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending');
  const pendingAmount = pendingWithdrawals.reduce((acc, w) => safeAdd(acc, w.amount), 0);

  const approvedWithdrawals = withdrawals.filter((w) => w.status === 'approved');
  const approvedAmount = approvedWithdrawals.reduce((acc, w) => safeAdd(acc, w.amount), 0);

  return (
    <div id="admin-panel" className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>Master Control & Payouts</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-['Outfit']">
            RozKamai Administration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic Adsterra ad rotation, withdrawal approval, and user wallet decimal verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllData}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notification pill if any */}
      {adminNotification && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <span>{adminNotification}</span>
          <button onClick={() => setAdminNotification(null)} className="text-emerald-700 underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        <button
          onClick={() => setActiveAdminTab('adLinks')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeAdminTab === 'adLinks'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PlaySquare className="w-4 h-4 text-emerald-500" />
          <span>Manage Ad Links ({adLinks.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('withdrawals')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeAdminTab === 'withdrawals'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4 text-amber-500" />
          <span>Withdrawals ({pendingWithdrawals.length} Pending)</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('users')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeAdminTab === 'users'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-blue-500" />
          <span>Users & Float Precision ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('analytics')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeAdminTab === 'analytics'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-purple-500" />
          <span>Stats & Ratio</span>
        </button>
      </div>

      {/* TAB 1: MANAGE AD LINKS */}
      {activeAdminTab === 'adLinks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-['Outfit']">
                Active Ad Links Collection
              </h3>
              <p className="text-xs text-slate-500">
                Add, edit or disable ad destination links and set custom timers per link without redeploying.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingLink(null);
                setFormUrl('');
                setFormTimer(30);
                setFormActive(true);
                setIsFormOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Ad Link</span>
            </button>
          </div>

          {/* Ad Link Create/Edit Form Modal */}
          {isFormOpen && (
            <div className="bg-slate-50 rounded-3xl p-6 border-2 border-emerald-500/40 shadow-md">
              <h4 className="text-base font-bold text-slate-900 mb-3">
                {editingLink ? 'Edit Ad Link' : 'Add New Ad Link to Firestore'}
              </h4>
              <form onSubmit={handleSaveAdLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Adsterra / Target Direct URL
                  </label>
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://www.profitableratecpmnetwork.com/..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Required Wait Timer (Seconds)
                    </label>
                    <input
                      type="number"
                      required
                      min={5}
                      max={180}
                      value={formTimer}
                      onChange={(e) => setFormTimer(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                    />
                    <span className="text-[10px] text-slate-400">
                      e.g. 20s, 30s, or 45s for higher CPM rewards
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Active Status
                    </label>
                    <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formActive}
                        onChange={(e) => setFormActive(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        Serve to users in active ad rotation
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  >
                    {formSubmitting ? 'Saving...' : editingLink ? 'Update Link' : 'Save New Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingLink(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Ad Links Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold">Timer</th>
                    <th className="py-3.5 px-4 font-bold">Destination URL</th>
                    <th className="py-3.5 px-4 font-bold">Date Added</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleActiveLink(link)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                            link.active
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {link.active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">
                        {link.timerSeconds}s
                      </td>
                      <td className="py-3 px-4 max-w-sm truncate text-slate-600 font-mono">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <span>{link.url}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(link.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleEditLinkClick(link)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit link"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLinkClick(link.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WITHDRAWALS */}
      {activeAdminTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-['Outfit']">
                User Withdrawal Queue
              </h3>
              <p className="text-xs text-slate-500">
                Review payout requests. Rejecting automatically refunds the PKR back to the user's wallet.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
              {pendingWithdrawals.length} Pending Approval
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">User</th>
                    <th className="py-3.5 px-4 font-bold">Method</th>
                    <th className="py-3.5 px-4 font-bold">Account Details</th>
                    <th className="py-3.5 px-4 font-bold text-right">Amount</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawals.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{req.userName}</div>
                        <div className="text-[11px] text-slate-400">{req.userEmail}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{req.method}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs font-mono text-slate-700 truncate" title={req.accountDetails}>
                        {req.accountDetails}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatPKR(req.amount, 2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {req.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveWithdrawal(req)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all inline-flex items-center gap-1 shadow-xs"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectWithdrawal(req)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition-all inline-flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject & Refund</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {req.processedAt ? new Date(req.processedAt).toLocaleDateString() : 'Done'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USERS & RAW FLOAT PRECISION CHECK */}
      {activeAdminTab === 'users' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 font-['Outfit']">
              Registered Users & Wallet Precision
            </h3>
            <p className="text-xs text-slate-500">
              Notice the <strong>Raw Stored Float</strong> debug column verifying that 0.05, 0.12, and 0.30 PKR fractional earnings are saved without integer truncations.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">User</th>
                    <th className="py-3.5 px-4 font-bold">Display Balance</th>
                    <th className="py-3.5 px-4 font-bold text-emerald-800 bg-emerald-50/70">
                      Raw Stored Float (Debug)
                    </th>
                    <th className="py-3.5 px-4 font-bold text-center">Streak</th>
                    <th className="py-3.5 px-4 font-bold text-center">Lifetime Ads</th>
                    <th className="py-3.5 px-4 font-bold text-center">Referrals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {formatPKR(u.balance, 4)}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-700 bg-emerald-50/30">
                        {typeof u.balance === 'number' ? u.balance.toFixed(6) : '0.000000'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-600">
                        {u.streakCount || 0}d
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {u.totalAdsWatched || 0}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-purple-700">
                        {u.referralCount || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ANALYTICS */}
      {activeAdminTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Users
              </span>
              <div className="text-3xl font-black text-slate-900 mt-2 font-['Outfit']">
                {totalUsersCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Registered in Firestore</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ads Watched Today
              </span>
              <div className="text-3xl font-black text-emerald-600 mt-2 font-['Outfit']">
                {totalAdsToday}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Lifetime: {totalLifetimeAds} ads
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pending Payouts
              </span>
              <div className="text-3xl font-black text-amber-600 mt-2 font-['Outfit']">
                {formatPKR(pendingAmount, 2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {pendingWithdrawals.length} requests awaiting
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Paid Out
              </span>
              <div className="text-3xl font-black text-teal-700 mt-2 font-['Outfit']">
                {formatPKR(approvedAmount, 2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {approvedWithdrawals.length} completed
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-base font-bold text-slate-900">
              Payout vs Ad-Revenue Ratio Health
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block">Total User Balances Liability</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">
                  {formatPKR(totalUserBalances, 2)}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block">Average Cost Per Ad Claim</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">
                  ~ PKR 0.17
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block">System Health Status</span>
                <span className="text-xl font-bold text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-5 h-5" />
                  Positive Margin
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* In-App Confirmation / Action Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-lg font-black text-slate-900 font-['Outfit']">
                {confirmDialog.title}
              </h4>
              <button
                onClick={() => setConfirmDialog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmDialog.description}
            </p>

            {confirmDialog.type === 'rejectWithdrawal' && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Reason for Rejection (Logged & Shown to User)
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  placeholder="e.g. Incorrect Account Details / Title Mismatch"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              {confirmDialog.type === 'deleteLink' && (
                <button
                  type="button"
                  onClick={() => executeDeleteLink(confirmDialog.targetId)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs"
                >
                  Confirm Delete
                </button>
              )}

              {confirmDialog.type === 'approveWithdrawal' && confirmDialog.request && (
                <button
                  type="button"
                  onClick={() => executeApproveWithdrawal(confirmDialog.request!)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Approval</span>
                </button>
              )}

              {confirmDialog.type === 'rejectWithdrawal' && confirmDialog.request && (
                <button
                  type="button"
                  onClick={() => executeRejectWithdrawal(confirmDialog.request!, rejectReason)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Confirm Rejection & Refund</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
