// Flow: person page (grouped debts), "บันทึกหนี้กับคนนี้" prefill, link a typed name to a contact,
// "save as contact" from the new-debt picker.
// node flows/debt-person.mjs
import { launch } from '../lib/browser.mjs';
import { ensureLoggedIn } from '../lib/auth.mjs';
import { readScreen, tapText, tapAt, waitForText } from '../lib/screen.mjs';
import { check, note, report, has, uniq } from '../lib/check.mjs';
import { L, FORM, createDebt, repay, openPerson, openList, openNew } from '../pages/debts.mjs';
import { createContact, contactNames } from '../pages/contacts.mjs';

const { browser, ctx, page, consoleErrors } = await launch();
await ensureLoggedIn(page, ctx, '/personal-debts');

// ---------- person page with two debts + a repayment ----------
const p = uniq('QA Person');
await createDebt(page, { amount: 100, person: p, description: 'first' });
await openNew(page);
await (await import('../pages/debts.mjs')).fillAndSaveNew(page, { amount: 50, person: p, description: 'second' });
await openPerson(page, p);
let s = await readScreen(page);
check('person/net-hero', has(s, `${p} ติดคุณ`) && has(s, '+฿150.00'), `hero: ${s.find((l) => l.includes(p))}`);
check('person/lists-both-debts', has(s, /^first/) && has(s, /^second/), `rows: ${s.filter((l) => /first|second/.test(l)).join(' / ')}`);
check('person/open-header', has(s, 'ค้างอยู่'), 'open section header "ค้างอยู่" missing');
check('person/add-debt-button', has(s, 'บันทึกหนี้กับคนนี้'), 'missing "บันทึกหนี้กับคนนี้"');
check('person/link-row', has(s, /^ผูกกับผู้ติดต่อ/), 'missing link-to-contact row for an unlinked name');

// "บันทึกหนี้กับคนนี้" prefills the person
await tapText(page, 'บันทึกหนี้กับคนนี้'); await page.waitForTimeout(1200);
s = await readScreen(page);
check('person/add-debt-prefills-person', has(s, `${L.counterparty} | ${p}`), `form: ${s.filter((l) => l.startsWith(L.counterparty)).join(' / ')}`);
await tapText(page, L.cancel); await page.waitForTimeout(900);

// ---------- link to a contact ----------
const cname = uniq('QA Contact');
await createContact(page, cname);
await openPerson(page, p);
await tapText(page, /^ผูกกับผู้ติดต่อ/); await page.waitForTimeout(1500);
s = await readScreen(page);
check('person/link-sheet-lists-contact', has(s, cname), `sheet: ${s.join(' / ')}`);
await tapText(page, cname); await page.waitForTimeout(2000);
s = await readScreen(page);
check('person/link-toast', has(s, /^ผูก 2 รายการกับ/), `toast: ${s.find((l) => l.includes('ผูก'))}`);
check('person/linked-header', has(s, /^ดูผู้ติดต่อ/) || has(s, cname), 'person page should now show the contact');
check('person/link-row-gone', !has(s, /^ผูกกับผู้ติดต่อ/), 'link row should disappear once linked');

// ---------- save-as-contact from the new-debt picker ----------
const sc = uniq('QA Savecon');
await openNew(page);
await tapAt(page, ...FORM.amount); await page.keyboard.type('12');
await tapText(page, L.counterparty); await page.waitForTimeout(900);
await page.keyboard.type(sc, { delay: 15 }); await page.waitForTimeout(600);
await tapText(page, L.saveAsContact); await page.waitForTimeout(2500);
await tapText(page, L.save); await page.waitForTimeout(2000);
const names = await contactNames(page);
check('create/save-as-contact-creates-contact', has(names, sc), `"บันทึกเป็นผู้ติดต่อ" closed the picker but the contact "${sc}" is not in /contacts`);

check('person/no-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' || '));
await browser.close();
const { fail } = report();
process.exit(fail ? 1 : 0);
