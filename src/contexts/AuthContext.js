// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  function login(email, password) { return signInWithEmailAndPassword(auth, email, password); }
  function logout() { return signOut(auth); }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          if (user.email === "vijey.prasanna@devverse1.in") {
            setUserRole("superadmin");
            setUserData({ name: "Vijey Prasanna", email: user.email, role: "superadmin", uid: user.uid });
            setLoading(false); return;
          }
          try {
            const adminDoc = await getDoc(doc(db, "admins", user.uid));
            if (adminDoc.exists()) {
              const data = adminDoc.data();
              setUserRole(data.status === "approved" ? "admin" : "pending");
              setUserData({ ...data, uid: user.uid });
              setLoading(false); return;
            }
          } catch (e) { console.error(e); }
          try {
            const internDoc = await getDoc(doc(db, "interns", user.uid));
            if (internDoc.exists()) {
              const data = internDoc.data();
              const s = data.status;
              if (s === "active" || s === "approved") {
                setUserRole("intern");
                setUserData({ ...data, uid: user.uid, status: "active" });
              } else if (s === "pending") {
                setUserRole("intern_pending");
                setUserData({ ...data, uid: user.uid });
              } else if (s === "cancelled") {
                setUserRole("cancelled");
                setUserData({ ...data, uid: user.uid });
              } else {
                setUserRole("intern");
                setUserData({ ...data, uid: user.uid });
              }
              setLoading(false); return;
            }
          } catch (e) { console.error(e); }
          setUserRole("pending");
          setUserData({ email: user.email, uid: user.uid });
        } else {
          setCurrentUser(null); setUserRole(null); setUserData(null);
        }
      } catch (e) { console.error(e); setUserRole("pending"); }
      finally { setLoading(false); }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userRole, userData, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
