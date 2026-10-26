// ALL debt-specific selectors/labels/positions live in this file (debts get reworked next round:
// when the UI changes, fix it here and the flows keep working).
import { goTo } from '../lib/nav.mjs';
import { tapText, tapAt, readScreen, find, nodes, settle, waitForText } from '../lib/screen.mjs';

export const ROUTES = {
  list: '/personal-debts',
  new: '/personal-debts/new',
  detail: (id) => `/personal-debts/${id}`,
  person: (name, contactId) =>
    `/personal-debts/person?name=${encodeURIComponent(name)}${contactId ? `&contact=${contactId}` : ''}`,
};

// Visible labels (Thai UI). One place to adapt after a rework.
export const L = {
  listTitle: 'หนี้สิน',
  emptyTitle: 'ยังไม่มีหนี้',
  addDebt: 'บันทึกหนี้',          // empty-state CTA on the list
  addDebtRow: /^บันทึกหนี้$/,       // the same button as the last row of a non-empty list (exact: titles contain it too)
  formOwedToMe: 'เขาติดฉัน',
  formIOwe: 'ฉันติดเขา',
  counterparty: 'กับใคร',
  currency: 'สกุลเงิน',
  save: /^บันทึก$/,        // exact: the top bar title also contains "บันทึก"
  cancel: /^ยกเลิก$/,
  useTypedName: /^ใช้ชื่อ/,
  saveAsContact: 'บันทึกเป็นผู้ติดต่อ',
};

// Form field positions (the fields expose no semantics label; tapped by position at 412x915).
export const FORM = {
  amount: [200, 198],
  description: [200, 400],
  note: [200, 500],
};

/** List page, waited until its content (net hero or empty state) is on screen. */
export async function openList(page) {
  await goTo(page, ROUTES.list);
  await waitForText(page, /^สุทธิ|^ยังไม่มีหนี้/, 8000);
  await settle(page, 400);
}
export const openNew = (page) => goTo(page, ROUTES.new);
export const openDetail = (page, id) => goTo(page, ROUTES.detail(id));
export const openPerson = (page, name, contactId) => goTo(page, ROUTES.person(name, contactId));

export const readDebtScreen = (page) => readScreen(page);

/** Fill + save the new-debt form (must already be on the form). Returns the detail-page URL id (if any). */
export async function fillAndSaveNew(page, { direction = 'owedToMe', amount, person, description, note, save = true }) {
  if (direction === 'iOwe') await tapText(page, L.formIOwe);
  await tapAt(page, ...FORM.amount);
  await page.keyboard.type(String(amount), { delay: 15 });
  if (person) {
    await tapText(page, L.counterparty);
    await settle(page, 1000);
    await page.keyboard.type(person, { delay: 15 });
    await settle(page, 700);
    await tapText(page, L.useTypedName);
    await settle(page, 700);
  }
  if (description) { await tapAt(page, ...FORM.description); await page.keyboard.type(description, { delay: 15 }); }
  if (note) { await tapAt(page, ...FORM.note); await page.keyboard.type(note, { delay: 15 }); }
  if (!save) return null;
  await tapText(page, L.save);
  await settle(page, 2000);
  return (page.url().match(/personal-debts\/([0-9a-f-]{36})/i) || [])[1] || null;
}

// ---- detail page ----
export const DETAIL = {
  editPencil: [364, 117],          // pencil in the hero (merged semantics node, so tap by position)
  repayBtn: /^(รับเงินคืน|จ่ายคืน)$/, // owedToMe = รับเงินคืน, iOwe = จ่ายคืน
  cancelDebt: 'ยกเลิกหนี้นี้',
  deleteInEdit: 'ลบหนี้นี้',
  editAmount: [200, 348],          // amount field in edit mode (unscrolled)
};
export const REPAY = {
  full: 'ทั้งหมด', half: 'ครึ่งหนึ่ง', confirm: 'ยืนยัน',
  amount: [200, 490],              // amount field in the repay sheet
};
export const DIALOG = { confirmCancel: { text: 'ยกเลิกหนี้นี้', nth: 1 }, confirmDelete: /^ลบ$/ };   // exact: "ลบหนี้นี้" also contains "ลบ"

export async function openEditMode(page) {
  await tapAt(page, ...DETAIL.editPencil);
  await settle(page, 1000);
}
export async function repay(page, { amount, mode } = {}) {
  await tapText(page, DETAIL.repayBtn);
  await settle(page, 1000);
  if (mode === 'half') await tapText(page, REPAY.half);
  else if (mode === 'full') await tapText(page, REPAY.full);
  if (amount != null) {
    await tapAt(page, ...REPAY.amount);
    await page.keyboard.press('Control+A');
    await page.keyboard.type(String(amount), { delay: 15 });
  }
  await settle(page, 400);
  await tapText(page, REPAY.confirm);
  await settle(page, 1800);
}
/** Create a debt through the form and return its id (from the URL). */
export async function createDebt(page, opts) {
  await openNew(page);
  return fillAndSaveNew(page, opts);
}

export async function cancelDebt(page, { confirm = true } = {}) {
  await tapText(page, DETAIL.cancelDebt); await settle(page, 800);
  if (!confirm) return;
  await tapText(page, DIALOG.confirmCancel.text, { nth: DIALOG.confirmCancel.nth }); await settle(page, 1800);
}
/** Edit mode → scroll → ลบหนี้นี้ → dialog. confirm=false leaves the dialog open. */
export async function deleteFromEdit(page, { confirm = true } = {}) {
  await openEditMode(page);
  await page.mouse.move(200, 500); await page.mouse.wheel(0, 500); await settle(page, 500);
  await tapText(page, DETAIL.deleteInEdit); await settle(page, 800);
  if (!confirm) return;
  await tapText(page, DIALOG.confirmDelete); await settle(page, 2000);
}

// ---- list page ----
export const LIST = {
  search: [200, 270],              // name search field
  statusChip: /^สถานะ/,
  statusAll: [87, 398],            // "ทั้งหมด" in the status dropdown (opens under the chip)
  cardOwedToMe: /^ติดคุณ/,         // hero card = direction filter (toggle)
  cardIOwe: /^คุณติด/,
  noMatch: 'ไม่พบคนที่ค้นหา',
};
/** "฿1,234.50" / "+฿10.00" / "−฿5.00" → number (sign respected). */
export const money = (str) => {
  const m = String(str).match(/([+−-])?\s*฿\s*([\d,]+(?:\.\d+)?)/);
  if (!m) return NaN;
  const v = parseFloat(m[2].replace(/,/g, ''));
  return m[1] === '-' || m[1] === '−' ? -v : v;
};

/** Remove a QA debt by id (test cleanup): detail → edit → ลบหนี้นี้ → ลบ. */
export async function deleteDebtById(page, id) {
  await openDetail(page, id);
  await settle(page, 800);
  await deleteFromEdit(page);
}
