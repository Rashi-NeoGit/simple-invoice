import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiResponse({ status: 200, description: 'API and database are reachable' })
  @ApiResponse({ status: 503, description: 'Database is not reachable' })
  async check() {
    const databaseOk = this.dataSource.isInitialized && (await this.pingDatabase());
    if (!databaseOk) {
      // A non-2xx status here is what makes this a real Docker healthcheck target,
      // not just "the port is open" (see Lessons applied in the project plan).
      throw new ServiceUnavailableException('Database is not reachable');
    }
    return { status: 'ok', database: 'up', timestamp: new Date().toISOString() };
  }

  private async pingDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
