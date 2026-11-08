// ============================================================
// ServiceError — ช่องทางเดียวที่ services โยน error ออกมา
// route จับแล้วแปลงเป็น HTTP response ผ่าน handleRouteError
// เช่น throw new ServiceError(409, 'Already clocked in today')
// ============================================================

/** error ของ business logic ที่รู้สถานะ HTTP ล่วงหน้า (4xx ต่างๆ) */
export class ServiceError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
