"use client";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [lesson, setLesson] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch("/api/challenge/today/user123").then(res => res.json()).then(setLesson);
  }, []);

  return (
    <div>
      <h1>Finelo 28‑Day Challenge</h1>
      {lesson && <div>{lesson.title}</div>}
    </div>
  );
}
