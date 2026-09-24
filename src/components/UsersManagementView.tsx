/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  UsersRound, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  CheckCircle, 
  UserPlus, 
  Search,
  Shield,
  Briefcase,
  Mail,
  Key,
  Eye,
  EyeOff,
  ChevronDown,
  Lock
} from "lucide-react";
import { User as UserType, UserRole } from "../types.js";

interface UsersManagementViewProps {
  users: UserType[];
  currentUser: UserType;
  onCreateUser: (uData: Partial<UserType>) => Promise<any>;
  onUpdateUser: (id: string, uData: Partial<UserType>) => Promise<any>;
  onDeleteUser: (id: string) => Promise<any>;
  onRefresh: () => Promise<any>;
}

export default function UsersManagementView({
  users,
  currentUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onRefresh,
}: UsersManagementViewProps) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  
  const [activeSubTab, setActiveSubTab] = useState<"users" | "roles">("users");
  
  // Action dropdown state
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  // Password visibility states
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Pagination states
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 10;

  // Form states
  const [formUsername, setFormUsername] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<UserRole>(UserRole.WAREHOUSE_ADMIN);
  const [formPassword, setFormPassword] = useState("");
  
  const [submitError, setSubmitError] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Reset page when search changes
  React.useEffect(() => {
    setUserPage(1);
  }, [search]);

  // Filter and Search
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * usersPerPage,
    userPage * usersPerPage
  );

  const openCreateModal = () => {
    setEditingUser(null);
    setFormUsername("");
    setFormName("");
    setFormEmail("");
    setFormRole(UserRole.WAREHOUSE_ADMIN);
    setFormPassword("");
    setSubmitError("");
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserType) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormPassword(user.password || "");
    setSubmitError("");
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setLoadingSubmit(true);

    if (!formUsername || !formName || !formEmail || !formRole) {
      setSubmitError("Harap isi semua field yang wajib!");
      setLoadingSubmit(false);
      return;
    }

    const payload: Partial<UserType> = {
      username: formUsername.trim().toLowerCase(),
      name: formName.trim(),
      email: formEmail.trim(),
      role: formRole,
      password: formPassword.trim() || "admin123"
    };

    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, payload);
      } else {
        await onCreateUser(payload);
      }
      setIsModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Gagal menyimpan data user.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleDeleteClick = async (user: UserType) => {
    if (user.id === currentUser.id) {
      alert("Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan!");
      return;
    }
    if (user.username === "superadmin") {
      alert("Akun superadmin utama tidak dapat dihapus!");
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus user "${user.name}" (${user.username}) dari database?`)) {
      try {
        await onDeleteUser(user.id);
        await onRefresh();
      } catch (err: any) {
        alert(err.message || "Gagal menghapus user.");
      }
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // UI Helpers
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-red-200 uppercase tracking-wider">
            <Shield className="w-3 h-3 text-red-500" />
            Super Admin
          </span>
        );
      case UserRole.KEPALA_GUDANG:
        return (
          <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-teal-200 uppercase tracking-wider">
            <Shield className="w-3 h-3 text-teal-600" />
            Kepala Gudang
          </span>
        );
      case UserRole.WAREHOUSE_STAFF:
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 uppercase tracking-wider">
            <UsersRound className="w-3 h-3 text-emerald-600" />
            Petugas Gudang
          </span>
        );
      case UserRole.VERIFIER_RENDALHAR:
        return (
          <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-sky-200 uppercase tracking-wider">
            <CheckCircle className="w-3 h-3 text-sky-600" />
            Verifikator Rendalhar (L1)
          </span>
        );
      case UserRole.LOGISTICS_MANAGER:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 uppercase tracking-wider">
            <Briefcase className="w-3 h-3 text-amber-600" />
            Manager Logistik
          </span>
        );
      case UserRole.VP_RENDALHAR:
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-200 uppercase tracking-wider">
            <Shield className="w-3 h-3 text-indigo-600" />
            VP RENDALHAR
          </span>
        );
      case UserRole.SUPERINTENDENT:
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-purple-200 uppercase tracking-wider">
            <Briefcase className="w-3 h-3 text-purple-500" />
            Superintendent
          </span>
        );
      case UserRole.WAREHOUSE_ADMIN:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-200 uppercase tracking-wider">
            <UsersRound className="w-3 h-3 text-blue-500" />
            Warehouse Admin
          </span>
        );
      case UserRole.VESSEL_CREW:
        return (
          <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-teal-200 uppercase tracking-wider">
            <UsersRound className="w-3 h-3 text-teal-500" />
            Vessel Crew
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 uppercase tracking-wider">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans select-none selection:bg-blue-100" id="users-management-container">
      
      {/* Banner / Header Title */}
      <div className="bg-white border-b border-slate-200 px-6 py-4.5 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="w-5 h-5 text-blue-600" />
            <h1 className="text-base font-bold text-slate-900 uppercase tracking-tight">Database User & Role Management</h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Kelola data autentikasi, hak akses, password, dan pengaturan role pengguna sistem logistik internal PT. Pelayaran Bahtera Adhiguna.
          </p>
        </div>
        
        <button
          onClick={openCreateModal}
          className="self-start md:self-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          Tambah User Baru
        </button>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex border-b border-slate-200 bg-white px-6 shrink-0">
        <button
          type="button"
          onClick={() => setActiveSubTab("users")}
          className={`py-3 px-5 font-sans font-black text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "users"
              ? "border-blue-600 text-blue-600 bg-blue-50/40"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UsersRound className="w-4 h-4" />
          <span>Daftar Akun Pengguna ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("roles")}
          className={`py-3 px-5 font-sans font-black text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "roles"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/40"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Shield className="w-4 h-4 text-indigo-600" />
          <span>Matriks Role & Hak Akses System</span>
        </button>
      </div>

      {activeSubTab === "users" ? (
        <>
          {/* Control panel & Filtering */}
          <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari berdasarkan nama, username, email, role..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              Menampilkan <span className="font-bold text-slate-800">{filteredUsers.length}</span> user di dalam database
            </div>
          </div>

          {/* Grid / Table list of Users */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="overflow-x-auto flex-1 min-h-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="px-6 py-3.5 text-center w-12">No</th>
                      <th className="px-6 py-3.5">Nama & Detail Akun</th>
                      <th className="px-6 py-3.5">Username</th>
                      <th className="px-6 py-3.5">Email</th>
                      <th className="px-6 py-3.5">Role Sistem</th>
                      <th className="px-6 py-3.5 w-44">Password</th>
                      <th className="px-6 py-3.5 text-center w-36">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                          Tidak ada user yang ditemukan cocok dengan pencarian Anda.
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user, idx) => {
                        const isPasswordVisible = !!visiblePasswords[user.id];
                        const isDropdownOpen = activeActionId === user.id;

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-center text-slate-500 font-mono font-bold">
                              {(userPage - 1) * usersPerPage + idx + 1}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                    {user.name}
                                    {user.id === currentUser.id && (
                                      <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.2 rounded font-black font-mono tracking-wider uppercase">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{user.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-slate-700">
                              @{user.username}
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-mono text-[11px]">
                              {user.email}
                            </td>
                            <td className="px-6 py-4">
                              {getRoleBadge(user.role)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 font-mono text-xs text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 max-w-max">
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>
                                  {isPasswordVisible ? (user.password || "admin123") : "••••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(user.id)}
                                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer ml-1"
                                  title={isPasswordVisible ? "Sembunyikan Password" : "Tampilkan Password"}
                                >
                                  {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center">
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionId(isDropdownOpen ? null : user.id);
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-xs transition-all duration-200 cursor-pointer border border-slate-800"
                                  >
                                    <span>Actions</span>
                                    <ChevronDown className="w-3 h-3" />
                                  </button>

                                  {isDropdownOpen && (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionId(null);
                                        }}
                                      />
                                      <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-250 rounded-lg shadow-xl z-50 overflow-hidden text-left py-1 text-slate-700 animate-in fade-in duration-100 ring-1 ring-black/5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveActionId(null);
                                            openEditModal(user);
                                          }}
                                          className="w-full px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-800 flex items-center gap-2 cursor-pointer transition-colors text-left"
                                        >
                                          <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                                          <span>Edit User</span>
                                        </button>

                                        <button
                                          type="button"
                                          disabled={user.id === currentUser.id || user.username === "superadmin"}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveActionId(null);
                                            handleDeleteClick(user);
                                          }}
                                          className={`w-full px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-colors text-left ${
                                            user.id === currentUser.id || user.username === "superadmin"
                                              ? "text-slate-300 cursor-not-allowed"
                                              : "hover:bg-slate-100 text-rose-700 cursor-pointer"
                                          }`}
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                          <span>Hapus User</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* CARD PAGINATION BAR */}
              <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between font-mono text-[11px] font-bold shrink-0 shadow-2xs">
                <span className="text-slate-400 uppercase tracking-widest leading-none text-[10px] font-black">
                  TOTAL REKOR DATA: {filteredUsers.length} USER
                </span>

                <div className="flex items-center gap-1">
                  <button
                    disabled={userPage === 1}
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-3 py-1.5 text-slate-500">
                    Halaman {userPage} dari {totalPages}
                  </span>
                  <button
                    disabled={userPage === totalPages}
                    onClick={() => setUserPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>

            </div>
          </div>
        </>
      ) : (
        /* Sub-Tab 2: Roles & Privileges Matrix View */
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-slate-150 pb-4">
              <div>
                <h2 className="text-sm font-black font-display text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Daftar Role & Matriks Otorisasi Privilege WMS
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Berikut adalah hirarki role dan batas kewenangan akses tanda tangan digital berjenjang pada sistem WMS PT. Pelayaran Bahtera Adhiguna.
                </p>
              </div>
              <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg text-xs font-mono font-bold">
                6 Status Role Terdaftar
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  role: "Petugas Gudang",
                  user: "Maghfur Muhammad Alfin (alfin)",
                  badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
                  desc: "Petugas operasional penerimaan (receiving), pemeriksaan fisik suku cadang, dan penataan lokasi rak gudang.",
                  privileges: ["Receiving Inbound Suku Cadang", "Check Stock & Opname Gudang", "Print Label & QR Code", "Pengajuan TUG 5/TUG 10"]
                },
                {
                  role: "Staff Gudang",
                  user: "Maghfur Muhammad Alfin (alfin)",
                  badge: "bg-blue-100 text-blue-800 border-blue-300",
                  desc: "Staff pengeluar barang gudang utama, penyiapan fisik barang TUG 8, dan pengarsipan bukti penerimaan.",
                  privileges: ["Eksekusi Outbound Dispatch (TUG 8)", "Cetak Surat Jalan & Bon TUG 8", "Management Stok Master", "Opname Fisik Barang"]
                },
                {
                  role: "Verifikator Rendalhar (Level 1)",
                  user: "Maghfur Muhammad Alfin (alfin)",
                  badge: "bg-sky-100 text-sky-800 border-sky-300",
                  desc: "Pemeriksa kelayakan teknis dan verifikator administrasi dokumen TUG 5, TUG 6, TUG 8, dan TUG 10 tahap awal.",
                  privileges: ["Verifikasi Dokumen Level 1", "TTD Digital Level 1 (Alfin)", "Review SPK & WO Ref", "Export ZIP Batch TUG 6"]
                },
                {
                  role: "Manager Logistik (Level 2)",
                  user: "Mohamat Emir Ferdian (emir)",
                  badge: "bg-amber-100 text-amber-800 border-amber-300",
                  desc: "Pemberi persetujuan operasional pengeluaran logistik, alokasi anggaran barang, dan supervisi gudang.",
                  privileges: ["Approval Operasional Level 2", "TTD Digital Level 2 (Emir)", "Validasi Anggaran BPP", "Monitoring Realtime Analytics"]
                },
                {
                  role: "VP RENDALHAR (Level 3)",
                  user: "Sumbono (sumbono)",
                  badge: "bg-indigo-100 text-indigo-800 border-indigo-300",
                  desc: "Pejabat pengesahan tertinggi seluruh dokumen logistik kapal PT. Pelayaran Bahtera Adhiguna.",
                  privileges: ["Pengesahan Akhir Level 3", "TTD Digital Level 3 (Sumbono)", "Status TUG Approved", "Executive Audit Ledger"]
                },
                {
                  role: "Super Admin",
                  user: "Fikri Haikal (superadmin)",
                  badge: "bg-rose-100 text-rose-800 border-rose-300",
                  desc: "Administrator pemilik sistem WMS dengan kewenangan penuh pengelolaan user, MySQL DB, dan audit trail.",
                  privileges: ["Full System Access", "User Account & Role Management", "Direct Database Persistence", "Bypass Emergency Approval"]
                }
              ].map((rItem, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-indigo-300 hover:shadow-sm transition-all">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${rItem.badge}`}>
                        {rItem.role}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400">ID: ROL-0{idx+1}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 mt-2.5">Pejabat / Akun Assigned:</h3>
                    <p className="text-xs font-mono font-extrabold text-indigo-700 bg-white px-2.5 py-1.5 rounded border border-slate-200 mt-1">
                      👤 {rItem.user}
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-2.5">
                      {rItem.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Matriks Otorisasi Privilege:
                    </span>
                    <div className="space-y-1">
                      {rItem.privileges.map((priv, pIdx) => (
                        <div key={pIdx} className="text-[10.5px] font-medium text-slate-700 flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{priv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-md w-full font-sans overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <UsersRound className="w-4 h-4 text-blue-600" />
                {editingUser ? "Edit User Account" : "Register New User Account"}
              </span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              
              {submitError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold leading-relaxed">
                  {submitError}
                </div>
              )}

              {/* Username field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Username (untuk Login):</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-slate-400 font-bold">@</span>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Contoh: ahmad_gudang"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <span className="text-[9px] text-slate-400">Username dapat diubah dan digunakan untuk masuk (login) ke sistem ini.</span>
              </div>

              {/* Full Name field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nama Lengkap User"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Email field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alamat Email:</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="user@maritime-logistics.com"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Password field with show password option */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Password Akun (untuk Login):</label>
                <div className="relative">
                  <input
                    type={showFormPassword ? "text" : "password"}
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Masukkan password baru/ganti password"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[9px] text-slate-400">Pastikan password aman dan mudah diingat oleh pengguna.</span>
              </div>

              {/* Role Select Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sistem Role (Privilege):</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={UserRole.KEPALA_GUDANG}>Kepala Gudang (Maghfur Muhammad Alfin)</option>
                  <option value={UserRole.WAREHOUSE_STAFF}>Petugas Gudang (Aldi Hidayat)</option>
                  <option value={UserRole.WAREHOUSE_ADMIN}>Staff Gudang</option>
                  <option value={UserRole.VERIFIER_RENDALHAR}>Verifikator Rendalhar (Level 1 Approval)</option>
                  <option value={UserRole.LOGISTICS_MANAGER}>Manager Logistik (Level 2 Approval - Emir)</option>
                  <option value={UserRole.VP_RENDALHAR}>VP RENDALHAR (Level 3 Pengesahan - Sumbono)</option>
                  <option value={UserRole.SUPER_ADMIN}>Super Admin (Pemilik Sistem - Fikri Haikal)</option>
                  <option value={UserRole.SUPERINTENDENT}>Superintendent (Pemeriksa / Verifikator TUG)</option>
                  <option value={UserRole.VESSEL_CREW}>Vessel Crew (Kru Kapal)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 -mx-5 -mb-5 mt-6 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 border border-slate-300 font-semibold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingSubmit}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loadingSubmit ? "Menyimpan..." : "Simpan Akun"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
