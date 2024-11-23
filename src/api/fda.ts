import { Client } from '@/lib/client';
import he from 'he';
import * as v from 'valibot';

// biome-ignore lint/suspicious/noExplicitAny: Types
type ExtractEntries<TSchema extends v.ObjectSchema<any, any>> = TSchema extends v.ObjectSchema<infer T, any>
  ? T
  : never;
// biome-ignore lint/suspicious/noExplicitAny: Types
type InferObjectEntries<TSchema extends v.ObjectSchema<any, any>> = v.ObjectSchema<
  ExtractEntries<TSchema>,
  undefined
>;

const REGEX_DATE = /datetime="([^"]+)"/;
const REGEX_HREF = /href="([^"]+)"/;
const REGEX_TEXT = />([^<]+)</;

export const FdaResponseSchema = v.object({
  draw: v.number(),
  recordsTotal: v.number(),
  recordsFiltered: v.number(),
  data: v.pipe(
    v.array(v.array(v.string())),
    v.transform((data: string[][]) => {
      return data.map((row) => {
        const [date, link, product, category, reason, company] = row.map((html) => he.decode(html));

        const matchedDate = date.match(REGEX_DATE);
        return {
          date: matchedDate ? new Date(matchedDate[1]) : undefined,
          link: {
            href: link.match(REGEX_HREF)?.[1] ?? '',
            text: link.match(REGEX_TEXT)?.[1]?.trim() ?? '',
          },
          product,
          category,
          reason,
          company,
        };
      });
    }),
  ),
});

export type FdaResponse = v.InferOutput<typeof FdaResponseSchema>;

export function createFdaClient() {
  const client = new Client('FDA', {
    method: 'GET',
    url: 'https://www.fda.gov/datatables/views/ajax',
    searchParams: () => {
      const columns: Array<
        [
          (
            | `columns[${number}][${'data' | 'searchable' | 'orderable'}]`
            | `columns[${number}][search][${'value' | 'regex'}]`
          ),
          string,
        ]
      > = [];
      for (let i = 0; i < 8; i++) {
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
              if (input === undefined) {
                return 'All';
              }
              return input ? 'Yes' : 'No';
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
    list: async (
      params: v.InferInput<(typeof client)['schema']>,
    ): Promise<
      | {
          ok: false;
          error: string;
        }
      | {
          ok: true;
          data: FdaResponse['data'];
          meta: Omit<FdaResponse, 'data'>;
        }
    > => {
      try {
        const resp = await client.get(params);
        if (!resp.ok) {
          return {
            ok: false,
            error: `${resp.status} Failed to fetch data: ${resp.statusText}`,
          };
        }
        const parsed = v.safeParse(FdaResponseSchema, await resp.json());
        if (!parsed.success) {
          return {
            ok: false,
            error: JSON.stringify(v.flatten(parsed.issues), null, 2),
          };
        }

        const { data, ...meta } = parsed.output;
        return {
          ok: true,
          data,
          meta,
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  };
}
