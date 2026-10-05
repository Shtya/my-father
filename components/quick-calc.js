"use client";

import { useState } from "react";
import { Calculator, Delete } from "lucide-react";
import { Sheet } from "@/components/form";

const OPS = ["÷", "×", "−", "+"];

export function QuickCalc() {
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState([]);
  const [done, setDone] = useState(false);

  function reset() {
    setParts([]);
    setDone(false);
  }

  function typeDigit(digit) {
    setDone(false);
    setParts((current) => {
      const next = done ? [] : [...current];
      const last = next.at(-1);
      if (!last || OPS.includes(last)) next.push(digit);
      else if (last.replace("-", "").replace(".", "").length >= 12) return current;
      else next[next.length - 1] = last === "0" ? digit : `${last}${digit}`;
      return next;
    });
  }

  function typeDot() {
    setDone(false);
    setParts((current) => {
      const next = done ? [] : [...current];
      const last = next.at(-1);
      if (!last || OPS.includes(last)) next.push("0.");
      else if (!last.includes(".")) next[next.length - 1] = `${last}.`;
      return next;
    });
  }

  function backspace() {
    setDone(false);
    setParts((current) => {
      if (!current.length) return current;
      const next = [...current];
      const last = next.at(-1);
      if (OPS.includes(last) || last.length === 1) next.pop();
      else next[next.length - 1] = last.slice(0, -1);
      return next;
    });
  }

  function percent() {
    setParts((current) => {
      if (!current.length || OPS.includes(current.at(-1))) return current;
      const next = [...current];
      next[next.length - 1] = plain(Number(next.at(-1)) / 100);
      return next;
    });
  }

  function chooseOp(operator) {
    setDone(false);
    setParts((current) => {
      if (!current.length) return current;
      const next = [...current];
      if (OPS.includes(next.at(-1))) next[next.length - 1] = operator;
      else next.push(operator);
      return next;
    });
  }

  function equals() {
    const value = evaluate(parts);
    if (value === null || value === "خطأ") return;
    setDone(true);
  }

  const expression = parts.join(" ") || "0";
  const value = evaluate(parts);
  const result = value === null ? "" : value === "خطأ" ? "خطأ" : grouped(plain(value));

  return (
    <>
      {open ? null : (
        <button type="button" className="calc-fab fixed end-3 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper text-green shadow-[0_8px_20px_rgb(28_36_28/0.16)]" aria-label="حاسبة" onClick={() => setOpen(true)}>
          <Calculator size={18} />
        </button>
      )}
      {open ? (
        <Sheet title="حاسبة" onClose={() => setOpen(false)}>
          <div dir="ltr" className="mb-3 text-right">
            <p className="num overflow-x-auto text-3xl font-semibold leading-none whitespace-nowrap">{expression}</p>
            <p className={`calc-figure num mt-2 h-7 text-xl ${value === "خطأ" ? "text-clay" : "text-muted"}`}>{result}</p>
          </div>
          <div dir="ltr" className="grid grid-cols-4 gap-2">
            <Key label="مسح" onClick={reset} tone="soft" />
            <Key label="مسح رقم" onClick={backspace} tone="soft"><Delete size={18} /></Key>
            <Key label="نسبة" onClick={percent} tone="soft">%</Key>
            <Key label="÷" tone="op" onClick={() => chooseOp("÷")}>÷</Key>
            {["7", "8", "9"].map((digit) => <Key key={digit} label={digit} onClick={() => typeDigit(digit)}>{digit}</Key>)}
            <Key label="×" tone="op" onClick={() => chooseOp("×")}>×</Key>
            {["4", "5", "6"].map((digit) => <Key key={digit} label={digit} onClick={() => typeDigit(digit)}>{digit}</Key>)}
            <Key label="−" tone="op" onClick={() => chooseOp("−")}>−</Key>
            {["1", "2", "3"].map((digit) => <Key key={digit} label={digit} onClick={() => typeDigit(digit)}>{digit}</Key>)}
            <Key label="+" tone="op" onClick={() => chooseOp("+")}>+</Key>
            <Key label="0" className="col-span-2" onClick={() => typeDigit("0")}>0</Key>
            <Key label="." onClick={typeDot}>.</Key>
            <Key label="=" tone="op" onClick={equals}>=</Key>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}

function Key({ label, onClick, tone = "num", className = "", children }) {
  const look = tone === "op" ? "bg-green" : tone === "soft" ? "bg-soft text-ink" : "border border-line bg-white";
  return (
    <button type="button" aria-label={label} className={`flex h-12 items-center justify-center text-lg font-semibold active:scale-95 ${look} ${className}`} onClick={onClick}>
      {children || label}
    </button>
  );
}

function evaluate(parts) {
  if (parts.length < 3 || parts.length % 2 === 0) return null;
  const numbers = [];
  const operators = [];
  for (let index = 0; index < parts.length; index += 1) {
    if (index % 2 === 0) numbers.push(Number(parts[index]));
    else operators.push(parts[index]);
  }
  if (numbers.some((number) => !Number.isFinite(number))) return "خطأ";
  const collapsed = [numbers[0]];
  const additive = [];
  for (let index = 0; index < operators.length; index += 1) {
    const operator = operators[index];
    const right = numbers[index + 1];
    if (operator === "×" || operator === "÷") {
      if (operator === "÷" && right === 0) return "خطأ";
      const left = collapsed.pop();
      collapsed.push(operator === "×" ? left * right : left / right);
    } else {
      additive.push(operator);
      collapsed.push(right);
    }
  }
  let total = collapsed[0];
  for (let index = 0; index < additive.length; index += 1) {
    total = additive[index] === "+" ? total + collapsed[index + 1] : total - collapsed[index + 1];
  }
  return total;
}

function plain(value) {
  if (!Number.isFinite(value)) return "خطأ";
  return String(Math.round(value * 1e10) / 1e10);
}

function grouped(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return new Intl.NumberFormat("en-US", { numberingSystem: "latn", maximumFractionDigits: 8 }).format(number);
}
