import type { NewRecall } from '@/db/schemas.sql';
import { Client } from '@/lib/client';
import { Result } from '@/lib/result';
import he from 'he';
import * as v from 'valibot';

const REGEX_DATE = /datetime="([^"]+)"/;
const REGEX_HREF = /href="([^"]+)"/;
const REGEX_TEXT = />([^<]+)</;

type Column =
  | `columns[${number}][${'data' | 'searchable' | 'orderable' | 'name'}]`
  | `columns[${number}][search][${'value' | 'regex'}]`;

export function createFdaClient() {
  const client = new Client('FDA', {
    url: 'https://www.fda.gov/datatables/views/ajax',
    searchParams: () => {
      const columns: Array<[Column, string]> = [];
      for (let i = 0; i < 8; i++) {
        columns.push([`columns[${i}][name]`, '']);
        columns.push([`columns[${i}][data]`, i.toString()]);
        columns.push([`columns[${i}][searchable]`, 'true']);
        columns.push([`columns[${i}][orderable]`, 'true']);
        columns.push([`columns[${i}][search][value]`, '']);
        columns.push([`columns[${i}][search][regex]`, 'false']);
      }

      return {
        draw: '2',
        total_items: '0',
        view_args: '',
        view_base_path: 'safety/recalls-market-withdrawals-safety-alerts/datatables-data',
        view_dom_id: 'db0539dc9749d1956af5cd86b2fac61acdd1e560e6ee28b95ec200c5f0f09ac8',
        view_display_id: 'recall_datatable_block_1',
        view_name: 'recall_solr_index',
        view_path: '/safety/recalls-market-withdrawals-safety-alerts',
        _drupal_ajax: '1',
        _wrapper_format: 'drupal_ajax',
        'search[value]': '',
        'search[regex]': 'false',
        ...Object.fromEntries(columns),
      };
    },
    schema: (defaultSchema) =>
      v.pipe(
        v.object({
          ...defaultSchema.entries,
          category: v.optional(
            v.picklist([
              'All',
              'Animal & Veterinary',
              'Biologics',
              'Cosmetics',
              'Dietary Supplements',
              'Drugs',
              'Food & Beverages',
              'Medical Devices',
              'Radiation-Emitting Products',
              'Tobacco',
            ]),
            'All',
          ),
          status: v.pipe(
            v.optional(v.boolean()),
            v.transform((input) => {
              if (input !== undefined) {
                return input ? 'Yes' : 'No';
              }
              return 'All';
            }),
          ),
        }),
        v.transform((input) => ({
          start: input.page,
          pager_element: input.offset,
          length: input.limit,
          search_api_fulltext: input.search,
          field_terminated_recall: input.status,
          field_regulated_product_field: input.category,
        })),
      ),
  });

  return {
    list: async (params?: v.InferInput<(typeof client)['schema']>) => {
      return Result.try(async () => {
        const resp = await client.get(params);
        if (!resp.ok) {
          throw new Error(`${resp.status} ${resp.statusText}`);
        }

        const { data, ...meta } = v.parse(
          v.object({
            draw: v.number(),
            recordsTotal: v.number(),
            recordsFiltered: v.number(),
            data: v.array(
              v.pipe(
                v.array(v.string()),
                v.transform((data) => {
                  const [date, link, product, category, reason, company] = data.map((html) => {
                    return he.decode(html);
                  });

                  return {
                    date: new Date(date.match(REGEX_DATE)?.[1] ?? ''),
                    url: new URL(link.match(REGEX_HREF)?.[1] ?? '', client.url).href,
                    brand: link.match(REGEX_TEXT)?.[1]?.trim() ?? '',
                    product,
                    category,
                    reason,
                    company,
                  } satisfies Omit<NewRecall, 'sourceId'>;
                }),
              ),
            ),
          }),
          await resp.json(),
        );

        return {
          name: client.name,
          meta,
          data,
        };
      });
    },
  };
}
