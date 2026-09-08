/* =========================================================
   PHISHTRACE — Version 4 concurrency queue
   =========================================================
   Gemini's free tier has its own rate limit, shared across every user of
   this site (since we all use the one admin key). If 20 people click
   "Analyze" at the same second, firing 20 requests at once risks Gemini
   rejecting most of them. This queue lets only a few run at a time and
   makes everyone else simply wait their turn — no dropped requests, no
   429 errors bubbling up to users, just a short queue.
   ========================================================= */
const MAX_CONCURRENT = 3;

let active = 0;
const waiting = [];

function runNext() {
  if (active >= MAX_CONCURRENT || waiting.length === 0) return;
  active++;
  const { task, resolve, reject } = waiting.shift();
  task()
    .then(resolve, reject)
    .finally(() => {
      active--;
      runNext();
    });
}

/* Wrap any async function so it only runs once a "slot" is free. */
function enqueue(task) {
  return new Promise((resolve, reject) => {
    waiting.push({ task, resolve, reject });
    runNext();
  });
}

module.exports = { enqueue };
