// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);

          // Superadmin check by email
          if (user.email === "vijey.prasanna@devverse1.in") {
            setUserRole("superadmin");
            setUserData({
              name: "Vijey Prasanna",
              email: user.email,
              role: "superadmin",
              uid: user.uid,
            });
            setLoading(false);
            return;
          }

          // Check admins collection
          try {
            const adminDoc = await getDoc(doc(db, "admins", user.uid));
            if (adminDoc.exists()) {
              const data = adminDoc.data();
              if (data.status === "approved") {
                setUserRole("admin");
                setUserData({ ...data, uid: user.uid });
                setLoading(false);
                return;
              } else {
                setUserRole("pending");
                setUserData({ email: user.email, uid: user.uid, status: data.status });
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.error("Admin check failed:", e);
          }

          // Check interns collection
          try {
            const internDoc = await getDoc(doc(db, "interns", user.uid));
            if (internDoc.exists()) {
              const data = internDoc.data();
              if (data.status === "approved") {
                setUserRole("intern");
                setUserData({ ...data, uid: user.uid });
              } else {
                setUserRole("pending");
                setUserData({ email: user.email, uid: user.uid, status: data.status });
              }
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("Intern check failed:", e);
          }

          // Unknown user
          setUserRole("pending");
          setUserData({ email: user.email, uid: user.uid });
        } else {
          setCurrentUser(null);
          setUserRole(null);
          setUserData(null);
        }
      } catch (e) {
        console.error("Auth error:", e);
        setUserRole("pending");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = { currentUser, userRole, userData, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
