import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AppGateway } from '../gateway/app.gateway';
import { DeclareResultDto } from './dto/declare-result.dto';

const BUCKET = 'result-documents';
const MAX_SIZE = 1024 * 1024; // 1 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

@Injectable()
export class ResultsService {
  constructor(private supabase: SupabaseService, private gateway: AppGateway) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from('results')
      .select('*, lotteries(name, draw_time)')
      .order('declared_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async declare(dto: DeclareResultDto) {
    const sb = this.supabase.getClient();

    const { data: result, error: rErr } = await sb
      .from('results')
      .insert({
        lottery_id: dto.lottery_id,
        winning_number: dto.winning_number,
        prize_2: dto.prize_2 ?? null,
        prize_3: dto.prize_3 ?? null,
        prize_4: dto.prize_4 ?? null,
        prize_5: dto.prize_5 ?? null,
        complementary_numbers: dto.complementary_numbers ?? [],
        document_url: dto.document_url ?? null,
      })
      .select()
      .single();
    if (rErr) throw new Error(rErr.message);

    const { data: lottery } = await sb
      .from('lotteries')
      .select('name')
      .eq('id', dto.lottery_id)
      .single();

    await sb.from('lotteries').update({ status: 'done' }).eq('id', dto.lottery_id);

    const payload = { ...result, winning_number: dto.winning_number, lottery_name: lottery.name };
    this.gateway.emitResultDeclared(payload);
    this.gateway.emitLotteryClosed({ id: dto.lottery_id, status: 'done' });

    return result;
  }

  async uploadDocument(file: { originalname: string; mimetype: string; buffer: Buffer; size: number }) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, and PDF files are allowed');
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File size must not exceed 1 MB');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const sb = this.supabase.getClient();

    // Create bucket if it doesn't exist yet (idempotent — ignore "already exists" error)
    await sb.storage.createBucket(BUCKET, { public: true }).catch(() => {});

    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(filename);

    return { url: publicUrl };
  }
}
