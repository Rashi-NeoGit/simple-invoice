import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { moneyTransformer } from '../common/money';
import { User } from '../users/user.entity';
import { InvoiceItem } from './invoice-item.entity';

/** Only these three are ever persisted. "Overdue" is always derived at read time — never stored. */
export enum InvoiceStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  PAID = 'Paid',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @Column({ name: 'invoice_reference', nullable: true })
  invoiceReference?: string;

  @Column({ name: 'invoice_date', type: 'date' })
  @Index()
  invoiceDate: string;

  @Column({ name: 'due_date', type: 'date' })
  @Index()
  dueDate: string;

  @Column()
  currency: string;

  @Column({ name: 'currency_symbol' })
  currencySymbol: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  @Index()
  status: InvoiceStatus;

  @Column({
    name: 'invoice_sub_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: moneyTransformer,
  })
  invoiceSubTotal: number;

  @Column({
    name: 'total_tax',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: moneyTransformer,
  })
  totalTax: number;

  @Column({
    name: 'total_discount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: moneyTransformer,
  })
  totalDiscount: number;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: moneyTransformer,
  })
  @Index()
  totalAmount: number;

  @Column({
    name: 'total_paid',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: moneyTransformer,
  })
  totalPaid: number;

  @Column({
    name: 'balance_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: moneyTransformer,
  })
  balanceAmount: number;

  @Column({ name: 'customer_fullname' })
  @Index()
  customerFullname: string;

  @Column({ name: 'customer_email' })
  customerEmail: string;

  @Column({ name: 'customer_mobile', nullable: true })
  customerMobile?: string;

  @Column({ name: 'customer_address', nullable: true })
  customerAddress?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items: InvoiceItem[];
}
