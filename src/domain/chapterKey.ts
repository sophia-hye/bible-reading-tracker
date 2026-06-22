/** 장 식별 키 "bookOrder:chapter" */
export function chapterKey(bookOrder: number, chapter: number): string {
  return `${bookOrder}:${chapter}`;
}
