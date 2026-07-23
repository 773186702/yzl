/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

/**
 * تسجيل نشاط في سجل التدقيق (Audit Log)
 * @param action نوع العملية (مثلاً: إضافة مهمة، تعديل صلاحيات)
 * @param details تفاصيل العملية
 */
export const logActivity = async (action: string, details: string) => {
  const path = 'audit_logs';
  try {
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, path), {
      user_id: user.uid,
      username: user.displayName || user.email || 'Unknown',
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};
