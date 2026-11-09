"use client";

import { useEffect, useState } from "react";
import { Plus, MapPin, Pencil } from "lucide-react";
import { useLocations } from "@/hooks/resources";
import { useQueryFlag } from "@/hooks/useQueryFlag";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, LoadingBlock, ErrorState } from "@/components/ui/states";
import { LocationFormModal } from "@/components/locations/location-form";
import { stateName } from "@/lib/utils";
import type { Location } from "@/types/api";

export default function LocationsPage() {
  const openNewFlag = useQueryFlag("new");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const { data, isLoading, isError, refetch } = useLocations({ page, per_page: 15 });

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (l: Location) => {
    setEditing(l);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  useEffect(() => {
    if (openNewFlag) openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNewFlag]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Terminals, parks and pickup points across your network."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New location
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No locations yet"
            description="Add terminals and pickup points to build routes."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> New location
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>City</TH>
                  <TH>State</TH>
                  <TH>Address</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((l) => (
                  <TR key={l.id}>
                    <TD className="font-medium text-slate-900">{l.name}</TD>
                    <TD>{l.city ?? "—"}</TD>
                    <TD>{stateName(l.state)}</TD>
                    <TD className="max-w-[18rem] truncate text-slate-600" title={l.address ?? undefined}>
                      {l.address ?? "—"}
                    </TD>
                    <TD className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(l)}
                        aria-label="Edit location"
                      >
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination
              page={data?.meta?.current_page ?? page}
              lastPage={data?.meta?.last_page ?? 1}
              total={data?.meta?.total}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <LocationFormModal open={showForm} onClose={closeForm} location={editing} />
    </div>
  );
}
