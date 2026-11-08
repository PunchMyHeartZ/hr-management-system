// ============================================================
// บริการประกาศบริษัท — ข่าวสารจากฝ่ายบุคคล (LEFT JOIN users เพื่อโชว์ชื่อผู้เขียน
// แม้บัญชีผู้เขียนถูกลบไปแล้วก็ยังเห็นประกาศ แค่ไม่มีชื่อ)
// ============================================================
import { pool } from '../db';
import { ServiceError } from './errors';

export interface AnnouncementRecord {
  announcement_id: number;
  title: string;
  body: string;
  author_name: string | null;
  created_at: Date;
}

const SELECT_ANNOUNCEMENTS = `
  SELECT a.announcement_id, a.title, a.body, u.full_name AS author_name, a.created_at
  FROM announcements a
  LEFT JOIN users u ON u.user_id = a.created_by
`;

export interface AnnouncementBody {
  title: string;
  body: string;
}

/** ประกาศล่าสุด 30 รายการ (ใหม่สุดก่อน) — แสดงบน Dashboard หน้าแรก */
export async function listAnnouncements(): Promise<AnnouncementRecord[]> {
  const { rows } = await pool.query<AnnouncementRecord>(
    `${SELECT_ANNOUNCEMENTS} ORDER BY a.created_at DESC LIMIT 30`
  );
  return rows;
}

/** โพสต์ประกาศใหม่ (ผูกกับ authorId) แล้วดึงข้อมูลเต็มกลับมาโชว์ชื่อผู้เขียน */
export async function createAnnouncement(authorId: number, input: AnnouncementBody): Promise<AnnouncementRecord> {
  const { rows } = await pool.query<{ announcement_id: number }>(
    `INSERT INTO announcements (title, body, created_by)
     VALUES ($1, $2, $3)
     RETURNING announcement_id`,
    [input.title, input.body, authorId]
  );
  const { rows: full } = await pool.query<AnnouncementRecord>(
    `${SELECT_ANNOUNCEMENTS} WHERE a.announcement_id = $1`,
    [rows[0].announcement_id]
  );
  return full[0];
}

/** ลบประกาศ — ไม่เจอ 404 */
export async function deleteAnnouncement(id: number): Promise<void> {
  const { rowCount } = await pool.query('DELETE FROM announcements WHERE announcement_id = $1', [id]);
  if (rowCount === 0) throw new ServiceError(404, 'Announcement not found');
}
