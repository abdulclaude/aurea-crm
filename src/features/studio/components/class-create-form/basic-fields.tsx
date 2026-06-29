"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ClassFormValues,
  ClassSelectOption,
  ServiceTypeSelectOption,
} from "./schema";
import { DIFFICULTY_OPTIONS } from "./schema";

type BasicFieldsProps = {
  form: UseFormReturn<ClassFormValues>;
  serviceTypes: ServiceTypeSelectOption[];
  classTypes: ClassSelectOption[];
  instructors: ClassSelectOption[];
  rooms: ClassSelectOption[];
};

const NONE_VALUE = "__none__";

export function BasicFields({
  form,
  serviceTypes,
  classTypes,
  instructors,
  rooms,
}: BasicFieldsProps) {
  function applyServiceDefaults(serviceId: string) {
    const service = serviceTypes.find((item) => item.id === serviceId);
    if (!service) return;

    if (!form.getValues("name")) form.setValue("name", service.name);
    if (!form.getValues("description") && service.description) {
      form.setValue("description", service.description);
    }
    if (service.classTypeId) form.setValue("classTypeId", service.classTypeId);
    if (service.capacity) form.setValue("maxCapacity", String(service.capacity));
    form.setValue(
      "pricingModel",
      service.paymentType === "PAID" ? "DROP_IN" : service.paymentType,
    );
    if (service.price) form.setValue("dropInPrice", service.price);
    if (service.slidingScaleMinPrice) {
      form.setValue("slidingScaleMinPrice", service.slidingScaleMinPrice);
    }
    if (service.slidingScaleMaxPrice) {
      form.setValue("slidingScaleMaxPrice", service.slidingScaleMaxPrice);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Class name</FormLabel>
              <FormControl>
                <Input placeholder="Morning reformer" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="serviceTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Service type</FormLabel>
              <Select
                value={field.value || NONE_VALUE}
                onValueChange={(value) => {
                  field.onChange(value === NONE_VALUE ? "" : value);
                  if (value !== NONE_VALUE) applyServiceDefaults(value);
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No service type</SelectItem>
                  {serviceTypes.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="classTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Class type</FormLabel>
              <Select
                value={field.value || NONE_VALUE}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? "" : value)
                }
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No class type</SelectItem>
                  {classTypes.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-primary/75">Description</FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder="What members should expect" {...field} />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
          )}
        />
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="instructorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Instructor</FormLabel>
              <Select
                value={field.value || NONE_VALUE}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? "" : value)
                }
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                  {instructors.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="roomId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Room</FormLabel>
              <Select
                value={field.value || NONE_VALUE}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? "" : value)
                }
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No room</SelectItem>
                  {rooms.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                      {option.capacity ? ` (${option.capacity})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="difficulty"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-primary/75">Difficulty</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="imageUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-primary/75">Class image URL</FormLabel>
            <FormControl>
              <Input placeholder="https://example.com/class.jpg" {...field} />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
    </div>
  );
}
