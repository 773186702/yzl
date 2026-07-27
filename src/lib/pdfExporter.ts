import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface InvoicePDFData {
  invoiceId: string;
  clientName: string;
  clientId: string;
  serviceName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  date: string;
  notes?: string;
  passportNumber?: string;
}

export interface AccountData {
  name: string;
  balance: number;
  currency: string;
  trend: string;
}

export interface TransactionData {
  date: string;
  title: string;
  account: string;
  amount: number;
  type: 'income' | 'expense';
  currency: string;
}

export async function exportFinancialReportPDF(accounts: AccountData[], transactions: TransactionData[]): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.padding = '40px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f2b48';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif";
  container.style.boxSizing = 'border-box';

  let accountsHtml = accounts.map(acc => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
      <td style="padding: 12px; font-weight: 800; color: #0f2b48;">${acc.name}</td>
      <td style="padding: 12px; font-weight: 900; color: #0f2b48; text-align: left;">
        ${acc.balance.toLocaleString()} ${acc.currency}
      </td>
      <td style="padding: 12px; font-weight: 700; color: ${acc.trend.startsWith('+') ? '#16a34a' : '#dc2626'}; text-align: left;">
        ${acc.trend}
      </td>
    </tr>
  `).join('');

  let txHtml = transactions.map(tx => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
      <td style="padding: 12px; font-weight: 700; color: #475569;">${tx.date}</td>
      <td style="padding: 12px; font-weight: 800; color: #0f2b48;">${tx.title}</td>
      <td style="padding: 12px; font-weight: 700; color: #475569;">${tx.account}</td>
      <td style="padding: 12px; font-weight: 900; color: ${tx.type === 'income' ? '#16a34a' : '#dc2626'}; text-align: left;">
        ${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()} ${tx.currency}
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="border: 2px solid #0f2b48; border-radius: 20px; padding: 25px; background: #fafbfc;">
      <div style="display: flex; justify-content: space-between; items-align: center; border-bottom: 2px solid #00d2d3; padding-bottom: 15px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #0f2b48; letter-spacing: normal; word-spacing: normal;">
            شركة يزل للسفريات والخدمات اللوجستية
          </h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: 700; color: #00d2d3; text-transform: uppercase;">
            YAZAL TRAVEL & LOGISTICS SERVICES
          </p>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">
            تقرير مالي مفصل
          </p>
        </div>
        <div style="text-align: left;">
          <p style="margin: 0; font-size: 12px; color: #64748b;">تاريخ التقرير:</p>
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f2b48;">${new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <h2 style="font-size: 18px; color: #0f2b48; margin-bottom: 10px;">أرصدة الحسابات الحالية</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #0f2b48; color: #ffffff; font-size: 12px; text-align: right;">
            <th style="padding: 12px; font-weight: 800;">اسم الحساب</th>
            <th style="padding: 12px; font-weight: 800; text-align: left;">الرصيد</th>
            <th style="padding: 12px; font-weight: 800; text-align: left;">النمو</th>
          </tr>
        </thead>
        <tbody>
          ${accountsHtml}
        </tbody>
      </table>

      <h2 style="font-size: 18px; color: #0f2b48; margin-bottom: 10px;">العمليات الأخيرة</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #0f2b48; color: #ffffff; font-size: 12px; text-align: right;">
            <th style="padding: 12px; font-weight: 800;">التاريخ</th>
            <th style="padding: 12px; font-weight: 800;">البيان</th>
            <th style="padding: 12px; font-weight: 800;">الحساب</th>
            <th style="padding: 12px; font-weight: 800; text-align: left;">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${txHtml}
        </tbody>
      </table>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`YZL_Financial_Report_${Date.now()}.pdf`);
  } catch (error) {
    console.error('خطأ في تصدير التقرير المالي:', error);
    alert('حدث خطأ أثناء تصدير التقرير.');
  } finally {
    document.body.removeChild(container);
  }
}

// ============================================================
// دوال تصدير جديدة: كشوفات الحساب والتقارير المفصلة
// ============================================================

/**
 * واجهة بيانات كشف حساب الموظف
 */
export interface EmployeeStatementData {
  employeeName: string;
  employeeRole: string;
  period: string;
  totalTasks: number;
  totalRevenue: number;
  totalExpenses: number;
  totalWithdrawals: number;
  totalClientDebts: number;
  netBalance: number;
  transactions: {
    type: 'task' | 'expense' | 'withdrawal';
    description: string;
    date: string;
    amount: number;
    status?: string;
  }[];
}

/**
 * تصدير كشف حساب موظف بصيغة PDF منسقة ومرتبة
 */
export async function exportEmployeeStatementPDF(data: EmployeeStatementData): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.padding = '40px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f2b48';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif";
  container.style.boxSizing = 'border-box';

  let transactionsHtml = data.transactions.map(tx => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
      <td style="padding: 8px; font-weight: 700; color: #475569;">${tx.date}</td>
      <td style="padding: 8px; font-weight: 800; color: #0f2b48;">${tx.description}</td>
      <td style="padding: 8px; font-weight: 700; color: #475569; text-align: center;">
        <span style="background: ${tx.type === 'task' ? '#dbeafe' : tx.type === 'expense' ? '#fce7f3' : '#fef3c7'}; color: ${tx.type === 'task' ? '#1d4ed8' : tx.type === 'expense' ? '#be185d' : '#d97706'}; padding: 2px 8px; border-radius: 10px; font-size: 9px;">
          ${tx.type === 'task' ? 'مهمة' : tx.type === 'expense' ? 'مصروف' : 'سحب'}
        </span>
      </td>
      <td style="padding: 8px; font-weight: 900; color: ${tx.type === 'task' ? '#16a34a' : '#dc2626'}; text-align: left;">
        ${tx.type === 'task' ? '+' : '-'}${tx.amount.toLocaleString()}
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="border: 2px solid #0f2b48; border-radius: 20px; padding: 25px; background: #fafbfc;">
      <!-- الهيدر -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00d2d3; padding-bottom: 15px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f2b48;">
            شركة يزل للسفريات والخدمات اللوجستية
          </h1>
          <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700; color: #00d2d3;">
            YAZAL TRAVEL & LOGISTICS SERVICES
          </p>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">
            كشف حساب موظف • ${data.employeeName}
          </p>
        </div>
        <div style="text-align: left;">
          <p style="margin: 0; font-size: 11px; color: #64748b;">تاريخ التقرير:</p>
          <p style="margin: 0; font-size: 13px; font-weight: 700; color: #0f2b48;">${new Date().toLocaleDateString('ar-EG')}</p>
          <p style="margin: 3px 0 0 0; font-size: 10px; color: #64748b;">الفترة: ${data.period}</p>
        </div>
      </div>

      <!-- معلومات الموظف -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <div>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">اسم الموظف:</p>
          <p style="margin: 0; font-size: 16px; font-weight: 900; color: #0f2b48;">${data.employeeName}</p>
        </div>
        <div style="text-align: left;">
          <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">الدور الوظيفي:</p>
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #00d2d3;">${data.employeeRole}</p>
        </div>
      </div>

      <!-- بطاقات الملخص -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 12px; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 10px; color: #16a34a; font-weight: 700;">إجمالي الإيرادات</p>
          <p style="margin: 0; font-size: 16px; font-weight: 900; color: #15803d;">${data.totalRevenue.toLocaleString()}</p>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 10px; color: #dc2626; font-weight: 700;">إجمالي المصروفات</p>
          <p style="margin: 0; font-size: 16px; font-weight: 900; color: #b91c1c;">${data.totalExpenses.toLocaleString()}</p>
        </div>
        <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 12px; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 10px; color: #d97706; font-weight: 700;">صافي الرصيد</p>
          <p style="margin: 0; font-size: 16px; font-weight: 900; color: ${data.netBalance >= 0 ? '#15803d' : '#b91c1c'};">${data.netBalance.toLocaleString()}</p>
        </div>
      </div>

      <!-- جدول المعاملات -->
      <h3 style="font-size: 14px; color: #0f2b48; margin-bottom: 8px;">سجل المعاملات (${data.transactions.length})</h3>
      <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #0f2b48; color: #ffffff; font-size: 11px; text-align: right;">
            <th style="padding: 10px; font-weight: 800;">التاريخ</th>
            <th style="padding: 10px; font-weight: 800;">البيان</th>
            <th style="padding: 10px; font-weight: 800; text-align: center;">النوع</th>
            <th style="padding: 10px; font-weight: 800; text-align: left;">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${transactionsHtml}
        </tbody>
      </table>

      <!-- التوقيع -->
      <div style="display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
        <div style="text-align: center; width: 180px;">
          <p style="margin: 0 0 30px 0; font-size: 10px; font-weight: 700; color: #64748b;">توقيع المدير المالي</p>
          <div style="border-bottom: 1px solid #0f2b48;"></div>
        </div>
        <div style="text-align: center; width: 150px;">
          <div style="border: 2px solid #00d2d3; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; margin: 0 auto; background: #f0fdf4;">
            <span style="font-size: 9px; font-weight: 900; text-align: center;">معتمد</span>
          </div>
          <p style="margin: 5px 0 0 0; font-size: 8px; color: #00d2d3; font-weight: 800;">الختم الرقمي</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Employee_Statement_${data.employeeName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  } catch (error) {
    console.error('خطأ في تصدير كشف حساب الموظف:', error);
    alert('حدث خطأ أثناء تصدير كشف الحساب.');
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * واجهة بيانات كشف حساب العميل
 */
export interface ClientStatementData {
  clientName: string;
  clientId: string;
  clientPhone: string;
  clientPassport?: string;
  period: string;
  totalServices: number;
  totalPaid: number;
  totalRemaining: number;
  transactions: {
    taskId: string;
    serviceName: string;
    date: string;
    status: string;
    totalPrice: number;
    paidAmount: number;
    remainingAmount: number;
  }[];
}

/**
 * تصدير كشف حساب عميل بصيغة PDF منسقة ومرتبة
 */
export async function exportClientStatementPDF(data: ClientStatementData): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.padding = '40px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f2b48';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif";
  container.style.boxSizing = 'border-box';

  let transactionsHtml = data.transactions.map(tx => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
      <td style="padding: 8px; font-weight: 700; color: #475569;">${tx.date}</td>
      <td style="padding: 8px; font-weight: 800; color: #0f2b48;">${tx.serviceName}</td>
      <td style="padding: 8px; font-weight: 700; color: #475569;">#${tx.taskId}</td>
      <td style="padding: 8px; font-weight: 900; color: #0f2b48; text-align: left;">${tx.totalPrice.toLocaleString()}</td>
      <td style="padding: 8px; font-weight: 900; color: #16a34a; text-align: left;">${tx.paidAmount.toLocaleString()}</td>
      <td style="padding: 8px; font-weight: 900; color: ${tx.remainingAmount > 0 ? '#dc2626' : '#16a34a'}; text-align: left;">${tx.remainingAmount.toLocaleString()}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="border: 2px solid #0f2b48; border-radius: 20px; padding: 25px; background: #fafbfc;">
      <!-- الهيدر -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00d2d3; padding-bottom: 15px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f2b48;">
            شركة يزل للسفريات والخدمات اللوجستية
          </h1>
          <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700; color: #00d2d3;">
            YAZAL TRAVEL & LOGISTICS SERVICES
          </p>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">
            كشف حساب عميل • ${data.clientName}
          </p>
        </div>
        <div style="text-align: left;">
          <p style="margin: 0; font-size: 11px; color: #64748b;">تاريخ التقرير:</p>
          <p style="margin: 0; font-size: 13px; font-weight: 700; color: #0f2b48;">${new Date().toLocaleDateString('ar-EG')}</p>
          <p style="margin: 3px 0 0 0; font-size: 10px; color: #64748b;">الفترة: ${data.period}</p>
        </div>
      </div>

      <!-- معلومات العميل -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <div>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">اسم العميل:</p>
          <p style="margin: 0; font-size: 16px; font-weight: 900; color: #0f2b48;">${data.clientName}</p>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #475569;">كود العميل: <strong>${data.clientId}</strong></p>
        </div>
        <div style="text-align: left;">
          ${data.clientPhone ? `<p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">الهاتف:</p><p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f2b48;">${data.clientPhone}</p>` : ''}
          ${data.clientPassport ? `<p style="margin: 4px 0 0 0; font-size: 10px; color: #475569;">جواز السفر: <strong>${data.clientPassport}</strong></p>` : ''}
        </div>
      </div>

      <!-- بطاقات الملخص -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 12px; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 10px; color: #2563eb; font-weight: 700;">إجمالي الخدمات</p>
          <p style="margin: 0; font-size: 16px; font-weight: 900; color: #1d4ed8;">${data.totalServices.toLocaleString()}</p>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 12px; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 10px; color: #16a34a; font-weight: 700;">إجمالي المدفوعات</p>
          <p style="margin: 0; font-size: 16px; font-weight: 900; color: #15803d;">${data.totalPaid.toLocaleString()}</p>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 10px; color: #dc2626; font-weight: 700;">إجمالي المتبقي</p>
          <p style="margin: 0; font-size: 16px; font-weight: 900; color: #b91c1c;">${data.totalRemaining.toLocaleString()}</p>
        </div>
      </div>

      <!-- جدول المعاملات -->
      <h3 style="font-size: 14px; color: #0f2b48; margin-bottom: 8px;">سجل المعاملات (${data.transactions.length})</h3>
      <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #0f2b48; color: #ffffff; font-size: 10px; text-align: right;">
            <th style="padding: 10px; font-weight: 800;">التاريخ</th>
            <th style="padding: 10px; font-weight: 800;">الخدمة</th>
            <th style="padding: 10px; font-weight: 800;">رقم المعاملة</th>
            <th style="padding: 10px; font-weight: 800; text-align: left;">الإجمالي</th>
            <th style="padding: 10px; font-weight: 800; text-align: left;">المدفوع</th>
            <th style="padding: 10px; font-weight: 800; text-align: left;">المتبقي</th>
          </tr>
        </thead>
        <tbody>
          ${transactionsHtml}
        </tbody>
      </table>

      <!-- التوقيع والختم -->
      <div style="display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
        <div style="text-align: center; width: 180px;">
          <p style="margin: 0 0 30px 0; font-size: 10px; font-weight: 700; color: #64748b;">توقيع المحاسب</p>
          <div style="border-bottom: 1px solid #0f2b48;"></div>
        </div>
        <div style="text-align: center; width: 150px;">
          <div style="border: 2px solid #00d2d3; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; margin: 0 auto; background: #f0fdf4;">
            <span style="font-size: 9px; font-weight: 900; text-align: center;">معتمد<br/>مكفول</span>
          </div>
          <p style="margin: 5px 0 0 0; font-size: 8px; color: #00d2d3; font-weight: 800;">الختم الرقمي</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Client_Statement_${data.clientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  } catch (error) {
    console.error('خطأ في تصدير كشف حساب العميل:', error);
    alert('حدث خطأ أثناء تصدير كشف الحساب.');
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * واجهة بيانات تقرير عام (إيرادات، مصروفات، ديون)
 */
export interface ReportPDFData {
  title: string;
  period: string;
  summaryCards: { label: string; value: string; color: string }[];
  headers: string[];
  rows: string[][];
}

/**
 * تصدير تقرير عام بصيغة PDF (إيرادات، مصروفات، ديون، عملاء، موظفين...)
 */
export async function exportReportPDF(data: ReportPDFData): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.padding = '40px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f2b48';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif";
  container.style.boxSizing = 'border-box';

  let summaryCardsHtml = data.summaryCards.map(card => `
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; text-align: center;">
      <p style="margin: 0 0 4px 0; font-size: 9px; font-weight: 700; color: #64748b;">${card.label}</p>
      <p style="margin: 0; font-size: 14px; font-weight: 900; color: ${card.color};">${card.value}</p>
    </div>
  `).join('');

  let rowsHtml = data.rows.map((row, ri) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px; ${ri % 2 === 0 ? 'background: #f8fafc;' : ''}">
      ${row.map(cell => `<td style="padding: 6px 8px; font-weight: 700; color: #475569;">${cell}</td>`).join('')}
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="border: 2px solid #0f2b48; border-radius: 20px; padding: 25px; background: #fafbfc;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00d2d3; padding-bottom: 15px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f2b48;">
            شركة يزل للسفريات والخدمات اللوجستية
          </h1>
          <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700; color: #00d2d3;">
            YAZAL TRAVEL & LOGISTICS SERVICES
          </p>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">
            ${data.title}
          </p>
        </div>
        <div style="text-align: left;">
          <p style="margin: 0; font-size: 11px; color: #64748b;">تاريخ التقرير:</p>
          <p style="margin: 0; font-size: 13px; font-weight: 700; color: #0f2b48;">${new Date().toLocaleDateString('ar-EG')}</p>
          <p style="margin: 3px 0 0 0; font-size: 10px; color: #64748b;">الفترة: ${data.period}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(${Math.min(data.summaryCards.length, 4)}, 1fr); gap: 8px; margin-bottom: 20px;">
        ${summaryCardsHtml}
      </div>

      <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #0f2b48; color: #ffffff; font-size: 10px; text-align: right;">
            ${data.headers.map(h => `<th style="padding: 8px; font-weight: 800;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="' + data.headers.length + '" style="padding: 20px; text-align: center; color: #94a3b8; font-weight: 700;">لا توجد بيانات</td></tr>'}
        </tbody>
      </table>

      <p style="margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: center;">
        تم إنشاء هذا التقرير آلياً بواسطة نظام يزل لإدارة السفريات والخدمات اللوجستية
      </p>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`YZL_Report_${data.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  } catch (error) {
    console.error('خطأ في تصدير التقرير:', error);
    alert('حدث خطأ أثناء تصدير التقرير.');
  } finally {
    document.body.removeChild(container);
  }
}

export interface CompletedTaskData {
  clientName: string;
  serviceName: string;
  assignedTo: string;
  amount: number;
  date: string;
}

export async function exportCompletedTasksArabicPDF(tasks: CompletedTaskData[]): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.padding = '40px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f2b48';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif";
  container.style.boxSizing = 'border-box';

  let totalAmount = 0;
  let tasksHtml = tasks.map(t => {
    totalAmount += t.amount;
    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
        <td style="padding: 12px; font-weight: 800; color: #0f2b48;">${t.clientName}</td>
        <td style="padding: 12px; font-weight: 700; color: #475569;">${t.serviceName}</td>
        <td style="padding: 12px; font-weight: 700; color: #475569;">${t.assignedTo}</td>
        <td style="padding: 12px; font-weight: 700; color: #475569;">${t.date}</td>
        <td style="padding: 12px; font-weight: 900; color: #0f2b48; text-align: left;">
          ${t.amount.toLocaleString()}
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="border: 2px solid #0f2b48; border-radius: 20px; padding: 25px; background: #fafbfc;">
      <div style="display: flex; justify-content: space-between; items-align: center; border-bottom: 2px solid #00d2d3; padding-bottom: 15px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #0f2b48; letter-spacing: normal; word-spacing: normal;">
            شركة يزل للسفريات والخدمات اللوجستية
          </h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: 700; color: #00d2d3; text-transform: uppercase;">
            YAZAL TRAVEL & LOGISTICS SERVICES
          </p>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">
            تقرير المهام المنجزة
          </p>
        </div>
        <div style="text-align: left;">
          <p style="margin: 0; font-size: 12px; color: #64748b;">تاريخ التقرير:</p>
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f2b48;">${new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <div>
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">إجمالي عدد المهام:</p>
          <p style="margin: 0; font-size: 18px; font-weight: 900; color: #0f2b48;">${tasks.length} مهام</p>
        </div>
        <div style="text-align: left;">
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">القيمة الإجمالية للمهام:</p>
          <p style="margin: 0; font-size: 18px; font-weight: 900; color: #16a34a;">${totalAmount.toLocaleString()}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #0f2b48; color: #ffffff; font-size: 12px; text-align: right;">
            <th style="padding: 12px; font-weight: 800;">العميل</th>
            <th style="padding: 12px; font-weight: 800;">الخدمة</th>
            <th style="padding: 12px; font-weight: 800;">الموظف المنفذ</th>
            <th style="padding: 12px; font-weight: 800;">التاريخ</th>
            <th style="padding: 12px; font-weight: 800; text-align: left;">القيمة</th>
          </tr>
        </thead>
        <tbody>
          ${tasksHtml}
        </tbody>
      </table>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`YZL_Completed_Tasks_${Date.now()}.pdf`);
  } catch (error) {
    console.error('خطأ في تصدير التقرير:', error);
    alert('حدث خطأ أثناء تصدير التقرير.');
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * دالة تصدير الفواتير الرسمية إلى ملف PDF عالي الجودة يدعم اللغة العربية 100% بدون أي رموز أو تشويه
 * 
 * تستخدم هذه الدالة تقنية بناء عنصر HTML مخصص باللغة العربية مع اتجاه RTL وتطبيق خطوط عربية واضحة (Tajawal/Cairo)
 * ثم تحويل هذا العنصر إلى صورة عالي الدقة (Canvas) باستخدام html2canvas وتغليفه داخل ملف PDF باستخدام jsPDF.
 * 
 * الميزات المضمنة:
 * - دعم كامل للغة العربية والاتجاه من اليمين إلى اليسار (RTL).
 * - توليد وتضمين رمز QR رقمي مشفر يحتوي على كافة بيانات الفاتورة ورابط التحقق.
 * - تنسيق الجداول والمالية والجداول الإحصائية بشكل دقيق.
 * - ختم رسمي وتوقيع إلكتروني لشركة يزل للخدمات اللوجستية والسفريات.
 * 
 * @param data - بيانات الفاتورة المراد تصديرها
 */
export async function exportArabicInvoicePDF(data: InvoicePDFData): Promise<void> {
  // 1. توليد رمز الاستجابة السريعة QR Code
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(
      `https://yzl-travel.com/invoice/${data.invoiceId}?ver=VALID&client=${encodeURIComponent(data.clientName)}&amount=${data.totalAmount}`,
      { margin: 1, width: 200 }
    );
  } catch (err) {
    console.warn('حدث خطأ أثناء توليد كود QR:', err);
  }

  // 2. إنشاء حاوية HTML مؤقتة معالجة للغة العربية وباتجاه RTL
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.padding = '40px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f2b48';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif";
  container.style.boxSizing = 'border-box';

  const statusLabel = 
    data.status === 'completed' ? 'مكتمل ومعتمد' :
    data.status === 'in_progress' ? 'قيد التنفيذ' : 'معلق / بانتظار السداد';

  const statusBg = 
    data.status === 'completed' ? '#dcfce7' :
    data.status === 'in_progress' ? '#e0f2fe' : '#fef3c7';

  const statusColor = 
    data.status === 'completed' ? '#15803d' :
    data.status === 'in_progress' ? '#0369a1' : '#b45309';

  container.innerHTML = `
    <div style="border: 2px solid #0f2b48; border-radius: 20px; padding: 25px; background: #fafbfc;">
      <!-- الهيدر والترويسة الرسمية -->
      <div style="display: flex; justify-content: space-between; items-align: center; border-bottom: 2px solid #00d2d3; padding-bottom: 15px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #0f2b48; letter-spacing: normal; word-spacing: normal;">
            شركة يزل للسفريات والخدمات اللوجستية
          </h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: 700; color: #00d2d3; text-transform: uppercase;">
            YAZAL TRAVEL & LOGISTICS SERVICES
          </p>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">
            سند قبض وتخليص مالي رسمي • فاتورة رقم: <strong style="color: #0f2b48;">#${data.invoiceId}</strong>
          </p>
        </div>
        ${qrDataUrl ? `<img src="${qrDataUrl}" style="width: 85px; height: 85px; border-radius: 10px; border: 1px solid #cbd5e1;" />` : ''}
      </div>

      <!-- تفاصيل الفاتورة والعميل -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <div>
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">اسم العميل / المسافر:</p>
          <p style="margin: 0; font-size: 16px; font-weight: 900; color: #0f2b48;">${data.clientName}</p>
          ${data.passportNumber ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">جواز السفر: <strong>${data.passportNumber}</strong></p>` : ''}
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">معرف العميل: <strong>${data.clientId}</strong></p>
        </div>
        <div style="text-align: left;">
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">تاريخ الإصدار:</p>
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f2b48;">${data.date}</p>
          <div style="margin-top: 8px;">
            <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; display: inline-block;">
              حالة الطلب: ${statusLabel}
            </span>
          </div>
        </div>
      </div>

      <!-- جدول تفاصيل الخدمة والمالية -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #0f2b48; color: #ffffff; font-size: 12px; text-align: right;">
            <th style="padding: 12px; font-weight: 800;">الخدمة المطلوبة</th>
            <th style="padding: 12px; font-weight: 800; text-align: center;">طريقة الدفع</th>
            <th style="padding: 12px; font-weight: 800; text-align: left;">المبلغ الكلي</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <td style="padding: 14px; font-weight: 800; color: #0f2b48;">${data.serviceName}</td>
            <td style="padding: 14px; font-weight: 700; color: #475569; text-align: center;">${data.paymentMethod || 'نقداً'}</td>
            <td style="padding: 14px; font-weight: 900; color: #0f2b48; text-align: left;">
              ${data.totalAmount.toLocaleString()} ${data.currency}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ملخص الحساب والتخليص المالي -->
      <div style="display: flex; justify-content: space-between; items-align: flex-end; background: #f1f5f9; padding: 18px; border-radius: 15px;">
        <div style="font-size: 11px; color: #475569; max-width: 300px;">
          <p style="margin: 0 0 5px 0; font-weight: 800; color: #0f2b48;">ملاحظات وتعليمات:</p>
          <p style="margin: 0; line-height: 1.5;">${data.notes || 'هذه الفاتورة مستند رسمي معتمد من شركة يزل للسفريات والخدمات اللوجستية. يعتبر المبلغ المدفوع موثقاً فور صدور الختم الرقمي.'}</p>
        </div>

        <div style="text-align: left; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
            <span style="color: #64748b;">المبلغ المدفوع:</span>
            <span style="font-weight: 800; color: #16a34a;">${data.paidAmount.toLocaleString()} ${data.currency}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 2px solid #cbd5e1; font-size: 15px; font-weight: 900;">
            <span style="color: #0f2b48;">المبلغ المتبقي:</span>
            <span style="color: ${data.remainingAmount > 0 ? '#dc2626' : '#16a34a'};">
              ${data.remainingAmount.toLocaleString()} ${data.currency}
            </span>
          </div>
        </div>
      </div>

      <!-- التوقيع والختم -->
      <div style="display: flex; justify-content: space-between; items-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
        <div style="text-align: center; width: 180px;">
          <p style="margin: 0 0 35px 0; font-size: 11px; font-weight: 700; color: #64748b;">توقيع المحاسب المستلم</p>
          <div style="border-bottom: 1px solid #0f2b48;"></div>
        </div>
        <div style="text-align: center; width: 150px;">
          <div style="border: 2px solid #00d2d3; color: #0f2b48; border-radius: 50%; width: 75px; height: 75px; display: flex; items-align: center; justify-content: center; margin: 0 auto; transform: rotate(-8deg); background: #f0fdf4;">
            <span style="font-size: 10px; font-weight: 900; text-align: center;">معتمد<br/>مكفول</span>
          </div>
          <p style="margin: 5px 0 0 0; font-size: 9px; color: #00d2d3; font-weight: 800;">الختم الرقمي الرسمي</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // 3. التقاط عنصر HTML كصورة دقيقة عبر html2canvas
    const canvas = await html2canvas(container, {
      scale: 2, // دقة عالية
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Invoice_${data.invoiceId}_${data.clientName.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('خطأ في تصدير ملف PDF العربي:', error);
    alert('حدث خطأ أثناء تصدير ملف الفاتورة. يرجى المحاولة مرة أخرى.');
  } finally {
    document.body.removeChild(container);
  }
}
