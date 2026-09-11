import { Injectable } from '@nestjs/common';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class QueryHelper {
  /**
   * Builds consistent pagination options
   */
  getPagination({ page = 1, limit = 20 }: PaginationParams = {}) {
    const take = Math.min(limit, 100); // safety cap
    const skip = (page - 1) * take;

    return { skip, take, page, limit: take };
  }

  /**
   * Builds a consistent paginated response
   */
  buildPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  /**
   * Generic paginated finder (works with any Prisma model)
   */
  async paginate<T>(
    model: {
      findMany: (args: any) => Promise<T[]>;
      count: (args: any) => Promise<number>;
    },
    args: {
      where?: any;
      orderBy?: any;
      include?: any;
      select?: any;
    } = {},
    pagination: PaginationParams = {},
  ): Promise<PaginatedResult<T>> {
    const { skip, take, page, limit } = this.getPagination(pagination);

    const [data, total] = await Promise.all([
      model.findMany({
        ...args,
        skip,
        take,
      }),
      model.count({ where: args.where }),
    ]);

    return this.buildPaginatedResponse(data, total, page, limit);
  }
}
